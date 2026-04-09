const express = require("express");
const router = express.Router();
const prisma = require("../db");
const authenticate = require("../middleware/auth");

// ─── POST /game ─ Créer une nouvelle partie ──────────────────────────────────
router.post("/", authenticate, async (req, res) => {
  try {
    const { playerCount, playerColor } = req.body;

    if (!playerCount || !playerColor) {
      return res.status(400).json({ error: "playerCount et playerColor requis" });
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
      include: { players: true },
    });

    res.json({ game });
  } catch (err) {
    console.error("Erreur création partie:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /game/:id/finish ─ Enregistrer la fin d'une partie ─────────────────
router.post("/:id/finish", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { winnerColor, players, totalMoves, duration } = req.body;

    if (!winnerColor || !players || !Array.isArray(players)) {
      return res.status(400).json({ error: "winnerColor et players requis" });
    }

    // Vérifier que la partie existe
    const game = await prisma.game.findUnique({
      where: { id },
      include: { players: true },
    });

    if (!game) {
      return res.status(404).json({ error: "Partie introuvable" });
    }

    if (game.status === "finished") {
      return res.status(400).json({ error: "Partie déjà terminée" });
    }

    // Déterminer si le user connecté est le gagnant
    const userPlayer = game.players.find((p) => p.userId === req.userId);
    const isWinner = userPlayer && userPlayer.color === winnerColor;

    // Mettre à jour la partie
    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        status: "finished",
        winnerId: isWinner ? req.userId : null,
        finishedAt: new Date(),
      },
    });

    // Créer l'entrée MatchHistory
    await prisma.matchHistory.create({
      data: {
        gameId: id,
        playersData: JSON.stringify(players),
        duration: duration || 0,
        totalMoves: totalMoves || 0,
      },
    });

    // Mettre à jour les stats du user
    const currentStats = await prisma.userStats.findUnique({
      where: { userId: req.userId },
    });

    if (currentStats) {
      const newGamesPlayed = currentStats.totalGamesPlayed + 1;
      const newGamesWon = currentStats.gamesWon + (isWinner ? 1 : 0);
      const newGamesLost = currentStats.gamesLost + (isWinner ? 0 : 1);
      const newWinRate = newGamesPlayed > 0 ? (newGamesWon / newGamesPlayed) * 100 : 0;

      await prisma.userStats.update({
        where: { userId: req.userId },
        data: {
          totalGamesPlayed: newGamesPlayed,
          gamesWon: newGamesWon,
          gamesLost: newGamesLost,
          winRate: Math.round(newWinRate * 100) / 100,
          totalMoves: currentStats.totalMoves + (totalMoves || 0),
          averageGameDuration: Math.round(
            ((currentStats.averageGameDuration * currentStats.totalGamesPlayed) + (duration || 0)) / newGamesPlayed
          ),
        },
      });
    } else {
      await prisma.userStats.create({
        data: {
          userId: req.userId,
          totalGamesPlayed: 1,
          gamesWon: isWinner ? 1 : 0,
          gamesLost: isWinner ? 0 : 1,
          winRate: isWinner ? 100 : 0,
          totalMoves: totalMoves || 0,
          averageGameDuration: duration || 0,
        },
      });
    }

    res.json({ game: updatedGame, recorded: true });
  } catch (err) {
    console.error("Erreur fin de partie:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /game/stats/me ─ Récupérer les stats du user connecté ───────────────
router.get("/stats/me", authenticate, async (req, res) => {
  try {
    let stats = await prisma.userStats.findUnique({
      where: { userId: req.userId },
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

    res.json({ stats });
  } catch (err) {
    console.error("Erreur récupération stats:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /game/history ─ Récupérer l'historique des parties du user ──────────
router.get("/history", authenticate, async (req, res) => {
  try {
    const games = await prisma.game.findMany({
      where: {
        status: "finished",
        players: {
          some: { userId: req.userId },
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
      orderBy: { finishedAt: "desc" },
      take: 20,
    });

    const history = games.map((game) => {
      const userPlayer = game.players.find((p) => p.userId === req.userId);
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

    res.json({ history });
  } catch (err) {
    console.error("Erreur récupération historique:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /game/leaderboard ─ Classement global ──────────────────────────────
router.get("/leaderboard", async (req, res) => {
  try {
    const stats = await prisma.userStats.findMany({
      where: { totalGamesPlayed: { gt: 0 } },
      orderBy: { gamesWon: "desc" },
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

    const leaderboard = stats.map((s, index) => ({
      rank: index + 1,
      id: s.user.id,
      username: s.user.username,
      avatarUrl: s.user.avatarUrl,
      wins: s.gamesWon,
      losses: s.gamesLost,
      gamesPlayed: s.totalGamesPlayed,
      winRate: s.winRate,
    }));

    res.json({ leaderboard });
  } catch (err) {
    console.error("Erreur leaderboard:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Ajout Akim pour PlayerProfile
router.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const stats = await prisma.userStats.findUnique({
      where: { userId: id },
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

    if (!stats) {
      return res.status(404).json({ error: "Joueur introuvable" });
    }

    res.json({
      id: stats.user.id,
      username: stats.user.username,
      avatarUrl: stats.user.avatarUrl,
      wins: stats.gamesWon,
      gamesPlayed: stats.totalGamesPlayed,
      winRate: stats.winRate,
    });
  } catch (err) {
    console.error("Erreur récupération profil joueur:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
