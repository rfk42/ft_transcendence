const express = require("express");
const router = express.Router();
const prisma = require("../db");
const authenticate = require("../middleware/auth");
const {
  createRoom,
  getRoom,
  getRoomPublicState,
  joinRoom,
  rollDice,
  movePawn,
} = require("../roomsStore");

const updateLeaderboardRanks = async (tx) => {
  const rankedStats = await tx.userStats.findMany({
    where: {totalGamesPlayed: {gt: 0}},
    orderBy: [{gamesWon: "desc"}, {winRate: "desc"}, {updatedAt: "asc"}],
    select: {id: true},
  });

  await Promise.all(
    rankedStats.map((stat, index) =>
      tx.userStats.update({
        where: {id: stat.id},
        data: {rank: index + 1},
      }),
    ),
  );
};

const recordFinishedGame = async ({
  gameId,
  winnerColor,
  players,
  totalMoves = 0,
  duration = 0,
}) => {
  if (
    !gameId ||
    !winnerColor ||
    !Array.isArray(players) ||
    players.length === 0
  ) {
    throw new Error("Parametres de fin de partie invalides");
  }

  return prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: {id: gameId},
      include: {players: true, matchHistory: true},
    });

    if (!game) {
      throw new Error("Partie introuvable");
    }

    if (game.status === "finished") {
      return {game, recorded: false};
    }

    const playersByColor = new Map(
      players.map((player) => [player.color, player]),
    );
    const winnerPlayer = game.players.find(
      (player) => player.color === winnerColor,
    );

    const updatedGame = await tx.game.update({
      where: {id: gameId},
      data: {
        status: "finished",
        winnerId: winnerPlayer ? winnerPlayer.userId : null,
        finishedAt: new Date(),
      },
    });

    const serializedPlayers = game.players.map((player) => {
      const roomPlayer = playersByColor.get(player.color) ?? {};
      return {
        userId: player.userId,
        username: roomPlayer.username ?? null,
        avatarUrl: roomPlayer.avatarUrl ?? null,
        color: player.color,
        isWinner: player.color === winnerColor,
      };
    });

    if (game.matchHistory) {
      await tx.matchHistory.update({
        where: {gameId},
        data: {
          playersData: JSON.stringify(serializedPlayers),
          duration,
          totalMoves,
        },
      });
    } else {
      await tx.matchHistory.create({
        data: {
          gameId,
          playersData: JSON.stringify(serializedPlayers),
          duration,
          totalMoves,
        },
      });
    }

    await Promise.all(
      game.players.map(async (player) => {
        const isWinner = player.color === winnerColor;
        const currentStats = await tx.userStats.findUnique({
          where: {userId: player.userId},
        });

        if (currentStats) {
          const newGamesPlayed = currentStats.totalGamesPlayed + 1;
          const newGamesWon = currentStats.gamesWon + (isWinner ? 1 : 0);
          const newGamesLost = currentStats.gamesLost + (isWinner ? 0 : 1);
          const newWinRate =
            newGamesPlayed > 0 ? (newGamesWon / newGamesPlayed) * 100 : 0;

          await tx.userStats.update({
            where: {userId: player.userId},
            data: {
              totalGamesPlayed: newGamesPlayed,
              gamesWon: newGamesWon,
              gamesLost: newGamesLost,
              winRate: Math.round(newWinRate * 100) / 100,
              totalMoves: currentStats.totalMoves + totalMoves,
              averageGameDuration: Math.round(
                (currentStats.averageGameDuration *
                  currentStats.totalGamesPlayed +
                  duration) /
                  newGamesPlayed,
              ),
            },
          });
          return;
        }

        await tx.userStats.create({
          data: {
            userId: player.userId,
            totalGamesPlayed: 1,
            gamesWon: isWinner ? 1 : 0,
            gamesLost: isWinner ? 0 : 1,
            winRate: isWinner ? 100 : 0,
            totalMoves,
            averageGameDuration: duration,
          },
        });
      }),
    );

    await updateLeaderboardRanks(tx);

    return {game: updatedGame, recorded: true};
  });
};

const recordRoomGameIfFinished = async (room) => {
  if (!room?.winner || !room.gameId || room.statsRecorded) {
    return;
  }

  const duration = room.startedAt
    ? Math.max(0, Math.round((Date.now() - room.startedAt) / 1000))
    : 0;

  await recordFinishedGame({
    gameId: room.gameId,
    winnerColor: room.winner,
    players: room.players,
    totalMoves: room.totalMoves || 0,
    duration,
  });

  room.statsRecorded = true;
};

router.post("/rooms", authenticate, async (req, res) => {
  try {
    const playerCount = Number(req.body.playerCount) || 2;

    if (![2, 3, 4].includes(playerCount)) {
      return res.status(400).json({error: "playerCount doit etre 2, 3 ou 4"});
    }

    const user = await prisma.user.findUnique({
      where: {id: req.userId},
      select: {id: true, username: true, avatarUrl: true},
    });

    if (!user) {
      return res.status(404).json({error: "Utilisateur introuvable"});
    }

    const room = createRoom({
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      playerCount,
    });

    const game = await prisma.game.create({
      data: {
        status: "waiting",
        players: {
          create: {
            userId: user.id,
            color: room.activePlayers[0],
            position: 0,
          },
        },
      },
    });
    room.gameId = game.id;

    res.json({room: getRoomPublicState(room, user.id)});
  } catch (err) {
    console.error("Erreur creation room:", err);
    res.status(500).json({error: "Erreur serveur"});
  }
});

router.post("/rooms/:code/join", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {id: req.userId},
      select: {id: true, username: true, avatarUrl: true},
    });

    if (!user) {
      return res.status(404).json({error: "Utilisateur introuvable"});
    }

    const result = joinRoom({
      code: req.params.code,
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });

    if (result.error) {
      return res.status(400).json({error: result.error});
    }

    if (result.joined && result.room.gameId) {
      await prisma.gamePlayer.upsert({
        where: {
          gameId_userId: {
            gameId: result.room.gameId,
            userId: user.id,
          },
        },
        update: {
          color: result.room.players.find((player) => player.userId === user.id)
            ?.color,
        },
        create: {
          gameId: result.room.gameId,
          userId: user.id,
          color: result.room.players.find((player) => player.userId === user.id)
            ?.color,
          position: 0,
        },
      });
    }

    if (result.room.gameId && result.room.status === "playing") {
      await prisma.game.update({
        where: {id: result.room.gameId},
        data: {status: "playing"},
      });
    }

    res.json({room: getRoomPublicState(result.room, user.id)});
  } catch (err) {
    console.error("Erreur join room:", err);
    res.status(500).json({error: "Erreur serveur"});
  }
});

router.get("/rooms/:code", authenticate, (req, res) => {
  const room = getRoom(req.params.code);

  if (!room) {
    return res.status(404).json({error: "Room introuvable"});
  }

  res.json({room: getRoomPublicState(room, req.userId)});
});

router.post("/rooms/:code/roll", authenticate, (req, res) => {
  Promise.resolve()
    .then(async () => {
      const result = rollDice({
        code: req.params.code,
        userId: req.userId,
      });

      if (result.error) {
        return res.status(400).json({error: result.error});
      }

      await recordRoomGameIfFinished(result.room);
      res.json({room: getRoomPublicState(result.room, req.userId)});
    })
    .catch((err) => {
      console.error("Erreur roll room:", err);
      res.status(500).json({error: "Erreur serveur"});
    });
});

router.post("/rooms/:code/move", authenticate, (req, res) => {
  Promise.resolve()
    .then(async () => {
      const result = movePawn({
        code: req.params.code,
        userId: req.userId,
        pawnId: req.body.pawnId,
      });

      if (result.error) {
        return res.status(400).json({error: result.error});
      }

      await recordRoomGameIfFinished(result.room);
      res.json({room: getRoomPublicState(result.room, req.userId)});
    })
    .catch((err) => {
      console.error("Erreur move room:", err);
      res.status(500).json({error: "Erreur serveur"});
    });
});

router.post("/", authenticate, async (req, res) => {
  try {
    const {playerColor} = req.body;

    if (!playerColor) {
      return res.status(400).json({error: "playerColor requis"});
    }

    const game = await prisma.game.create({
      data: {
        status: "playing",
        players: {
          create: {
            userId: req.userId,
            color: playerColor,
            position: 0,
          },
        },
      },
      include: {players: true},
    });

    res.json({game});
  } catch (err) {
    console.error("Erreur creation partie:", err);
    res.status(500).json({error: "Erreur serveur"});
  }
});

router.post("/:id/finish", authenticate, async (req, res) => {
  try {
    const {id} = req.params;
    const {winnerColor, players, totalMoves, duration} = req.body;

    if (!winnerColor || !players || !Array.isArray(players)) {
      return res.status(400).json({error: "winnerColor et players requis"});
    }

    const result = await recordFinishedGame({
      gameId: id,
      winnerColor,
      players,
      totalMoves: totalMoves || 0,
      duration: duration || 0,
    });

    res.json(result);
  } catch (err) {
    console.error("Erreur fin de partie:", err);
    res.status(500).json({error: "Erreur serveur"});
  }
});

router.get("/stats/me", authenticate, async (req, res) => {
  try {
    let stats = await prisma.userStats.findUnique({
      where: {userId: req.userId},
    });

    if (!stats) {
      stats = {
        totalGamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        winRate: 0,
        rank: null,
        totalMoves: 0,
        averageGameDuration: 0,
      };
    }

    res.json({stats});
  } catch (err) {
    console.error("Erreur recuperation stats:", err);
    res.status(500).json({error: "Erreur serveur"});
  }
});

router.get("/history", authenticate, async (req, res) => {
  try {
    const games = await prisma.game.findMany({
      where: {
        status: "finished",
        players: {
          some: {userId: req.userId},
        },
      },
      include: {
        matchHistory: true,
        players: {
          select: {
            color: true,
            userId: true,
          },
        },
      },
      orderBy: {finishedAt: "desc"},
      take: 20,
    });

    const history = games.map((game) => {
      const userPlayer = game.players.find(
        (player) => player.userId === req.userId,
      );
      return {
        id: game.id,
        date: game.finishedAt || game.createdAt,
        isWinner: game.winnerId === req.userId,
        playerColor: userPlayer?.color || null,
        playerCount: game.players.length,
        duration: game.matchHistory?.duration || 0,
        totalMoves: game.matchHistory?.totalMoves || 0,
      };
    });

    res.json({history});
  } catch (err) {
    console.error("Erreur recuperation historique:", err);
    res.status(500).json({error: "Erreur serveur"});
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const stats = await prisma.userStats.findMany({
      where: {totalGamesPlayed: {gt: 0}},
      orderBy: {gamesWon: "desc"},
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    const leaderboard = stats.map((stat, index) => ({
      rank: index + 1,
      id: stat.user.id,
      username: stat.user.username,
      avatarUrl: stat.user.avatarUrl,
      wins: stat.gamesWon,
      losses: stat.gamesLost,
      gamesPlayed: stat.totalGamesPlayed,
      winRate: stat.winRate,
    }));

    res.json({leaderboard});
  } catch (err) {
    console.error("Erreur leaderboard:", err);
    res.status(500).json({error: "Erreur serveur"});
  }
});

router.get("/user/:id", async (req, res) => {
  try {
    const {id} = req.params;

    const stats = await prisma.userStats.findUnique({
      where: {userId: id},
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (stats) {
      return res.json({
        id: stats.user.id,
        username: stats.user.username,
        avatarUrl: stats.user.avatarUrl,
        wins: stats.gamesWon,
        gamesPlayed: stats.totalGamesPlayed,
        winRate: stats.winRate,
      });
    }

    const user = await prisma.user.findUnique({
      where: {id},
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return res.status(404).json({error: "Joueur introuvable"});
    }

    res.json({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      wins: 0,
      gamesPlayed: 0,
      winRate: 0,
    });
  } catch (err) {
    console.error("Erreur recuperation profil joueur:", err);
    res.status(500).json({error: "Erreur serveur"});
  }
});

module.exports = router;
