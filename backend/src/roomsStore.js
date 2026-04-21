const crypto = require("crypto");

const prisma = require("./db");
const {
  createInitialPawns,
  getPlayersForCount,
  getNextPlayer,
  getMovablePawnIds,
  applyPawnMove,
} = require("./ludoEngine");

function buildRoomCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

function hydrateRoom(room) {
  if (!room) {
    return null;
  }

  return {
    ...room,
    activePlayers: Array.isArray(room.activePlayers) ? room.activePlayers : [],
    players: Array.isArray(room.players) ? room.players : [],
    pawnsByPlayer: room.pawnsByPlayer || {},
    chatMessages: Array.isArray(room.chatMessages) ? room.chatMessages : [],
  };
}

function serializeRoom(room) {
  return {
    playerCount: room.playerCount,
    activePlayers: room.activePlayers,
    players: room.players,
    pawnsByPlayer: room.pawnsByPlayer,
    currentPlayer: room.currentPlayer,
    lastRoll: room.lastRoll,
    pendingRoll: room.pendingRoll,
    winner: room.winner,
    status: room.status,
    statusMessage: room.statusMessage,
    chatMessages: room.chatMessages,
    totalMoves: room.totalMoves,
    startedAt: room.startedAt,
    statsRecorded: room.statsRecorded,
    gameId: room.gameId,
  };
}

async function saveRoom(tx, room) {
  return hydrateRoom(
    await tx.roomSession.update({
      where: {code: room.code},
      data: serializeRoom(room),
    }),
  );
}

async function findUniqueCode(tx) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = buildRoomCode();
    const existing = await tx.roomSession.findUnique({where: {code}});
    if (!existing) {
      return code;
    }
  }

  throw new Error("Unable to generate unique room code");
}

function getRoomPublicState(room, userId = null) {
  return {
    code: room.code,
    playerCount: room.playerCount,
    activePlayers: room.activePlayers,
    players: room.players,
    pawnsByPlayer: room.pawnsByPlayer,
    currentPlayer: room.currentPlayer,
    lastRoll: room.lastRoll,
    pendingRoll: room.pendingRoll,
    winner: room.winner,
    status: room.status,
    statusMessage: room.statusMessage,
    chatMessages: room.chatMessages,
    me: room.players.find((player) => player.userId === userId) ?? null,
    movablePawnIds:
      room.pendingRoll === null || room.winner
        ? []
        : getMovablePawnIds(
            room.pawnsByPlayer,
            room.currentPlayer,
            room.pendingRoll,
          ),
  };
}

async function createRoom({userId, username, avatarUrl, playerCount}) {
  return prisma.$transaction(async (tx) => {
    const activePlayers = getPlayersForCount(playerCount);
    const code = await findUniqueCode(tx);
    const room = {
      code,
      playerCount,
      activePlayers,
      gameId: null,
      players: [
        {userId, username, avatarUrl: avatarUrl ?? null, color: activePlayers[0]},
      ],
      pawnsByPlayer: createInitialPawns(activePlayers),
      currentPlayer: activePlayers[0],
      lastRoll: null,
      pendingRoll: null,
      winner: null,
      status: "waiting",
      statusMessage: "Room created. Waiting for players.",
      chatMessages: [
        {
          id: crypto.randomUUID(),
          userId: null,
          username: "System",
          text: `Room with ${playerCount} players created.`,
          createdAt: new Date().toISOString(),
        },
      ],
      totalMoves: 0,
      startedAt: null,
      statsRecorded: false,
    };

    return hydrateRoom(
      await tx.roomSession.create({
        data: serializeRoom(room),
      }),
    );
  });
}

async function getRoom(code) {
  return hydrateRoom(
    await prisma.roomSession.findUnique({
      where: {code: String(code).toUpperCase()},
    }),
  );
}

async function joinRoom({code, userId, username, avatarUrl}) {
  return prisma.$transaction(async (tx) => {
    const room = hydrateRoom(
      await tx.roomSession.findUnique({
        where: {code: String(code).toUpperCase()},
      }),
    );

    if (!room) {
      return {error: "Room not found"};
    }

    const existingPlayer = room.players.find((player) => player.userId === userId);
    if (existingPlayer) {
      return {room, joined: false};
    }

    if (room.players.length >= room.playerCount) {
      return {error: "Room is full"};
    }

    const usedColors = new Set(room.players.map((player) => player.color));
    const color = room.activePlayers.find((entry) => !usedColors.has(entry));

    room.players.push({userId, username, avatarUrl: avatarUrl ?? null, color});
    room.chatMessages.push({
      id: crypto.randomUUID(),
      userId: null,
      username: "System",
      text: `${username} joined the room.`,
      createdAt: new Date().toISOString(),
    });
    room.status =
      room.players.length === room.playerCount ? "playing" : "waiting";
    if (room.status === "playing" && !room.startedAt) {
      room.startedAt = new Date();
    }
    room.statusMessage =
      room.status === "playing"
        ? `${room.currentPlayer} starts.`
        : `${username} joined the room.`;

    return {room: await saveRoom(tx, room), joined: true};
  });
}

async function addRoomMessage({code, userId, username, text}) {
  return prisma.$transaction(async (tx) => {
    const room = hydrateRoom(
      await tx.roomSession.findUnique({
        where: {code: String(code).toUpperCase()},
      }),
    );

    if (!room) {
      return {error: "Room not found"};
    }

    const player = room.players.find((entry) => entry.userId === userId);
    if (!player) {
      return {error: "You are not part of this room"};
    }

    const trimmedText = String(text ?? "").trim();
    if (!trimmedText) {
      return {error: "Empty message"};
    }

    room.chatMessages.push({
      id: crypto.randomUUID(),
      userId,
      username,
      text: trimmedText.slice(0, 300),
      createdAt: new Date().toISOString(),
    });
    room.chatMessages = room.chatMessages.slice(-40);

    return {room: await saveRoom(tx, room)};
  });
}

async function rollDice({code, userId}) {
  return prisma.$transaction(async (tx) => {
    const room = hydrateRoom(
      await tx.roomSession.findUnique({
        where: {code: String(code).toUpperCase()},
      }),
    );

    if (!room) {
      return {error: "Room not found"};
    }

    const player = room.players.find((entry) => entry.userId === userId);
    if (!player) {
      return {error: "You are not part of this room"};
    }

    if (room.status !== "playing") {
      return {error: "Game has not started yet"};
    }

    if (room.currentPlayer !== player.color) {
      return {error: "It's not your turn"};
    }

    const diceValue = Math.floor(Math.random() * 6) + 1;
    const movablePawnIds = getMovablePawnIds(
      room.pawnsByPlayer,
      room.currentPlayer,
      diceValue,
    );

    room.lastRoll = diceValue;

    if (movablePawnIds.length === 0) {
      room.currentPlayer = getNextPlayer(room.currentPlayer, room.activePlayers);
      room.statusMessage = `${player.username} rolled ${diceValue}, but no pawn can move.`;
      return {room: await saveRoom(tx, room)};
    }

    if (movablePawnIds.length === 1) {
      return movePawn({
        code,
        userId,
        pawnId: movablePawnIds[0],
        forcedRoll: diceValue,
        tx,
      });
    }

    room.pendingRoll = diceValue;
    room.statusMessage = `${player.username} rolled ${diceValue}. Choose a pawn.`;
    return {room: await saveRoom(tx, room)};
  });
}

async function movePawn({code, userId, pawnId, forcedRoll = null, tx = prisma}) {
  const room = hydrateRoom(
    await tx.roomSession.findUnique({
      where: {code: String(code).toUpperCase()},
    }),
  );

  if (!room) {
    return {error: "Room not found"};
  }

  const player = room.players.find((entry) => entry.userId === userId);
  if (!player) {
    return {error: "You are not part of this room"};
  }

  if (room.currentPlayer !== player.color) {
    return {error: "It's not your turn"};
  }

  const roll = forcedRoll ?? room.pendingRoll;
  if (roll === null) {
    return {error: "No pending roll"};
  }

  const movablePawnIds = getMovablePawnIds(
    room.pawnsByPlayer,
    room.currentPlayer,
    roll,
  );
  if (!movablePawnIds.includes(pawnId)) {
    return {error: "This pawn cannot move"};
  }

  const result = applyPawnMove(
    room.pawnsByPlayer,
    pawnId,
    roll,
    room.activePlayers,
  );

  room.pawnsByPlayer = result.pawns;
  room.pendingRoll = null;
  room.totalMoves += 1;

  if (result.winner) {
    room.winner = result.winner;
    room.status = "finished";
    room.statusMessage = `${player.username} won the game.`;
    return {room: await saveRoom(tx, room)};
  }

  if (roll === 6) {
    room.statusMessage = `${player.username} plays again (rolled a 6).`;
    return {room: await saveRoom(tx, room)};
  }

  room.currentPlayer = getNextPlayer(room.currentPlayer, room.activePlayers);
  room.statusMessage = `Turn over. ${room.currentPlayer}'s turn.`;
  return {room: await saveRoom(tx, room)};
}

module.exports = {
  addRoomMessage,
  createRoom,
  getRoom,
  getRoomPublicState,
  joinRoom,
  rollDice,
  movePawn,
};
