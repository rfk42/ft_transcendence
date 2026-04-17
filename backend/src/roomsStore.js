const crypto = require("crypto");
const {
  createInitialPawns,
  getPlayersForCount,
  getNextPlayer,
  getMovablePawnIds,
  applyPawnMove,
} = require("./ludoEngine");

const rooms = new Map();

const buildRoomCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();

const getRoom = (code) => rooms.get(String(code).toUpperCase()) ?? null;

const getRoomPublicState = (room, userId = null) => ({
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
});

const createRoom = ({userId, username, avatarUrl, playerCount}) => {
  const activePlayers = getPlayersForCount(playerCount);
  const room = {
    code: buildRoomCode(),
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
    statusMessage: "Room creee. En attente des joueurs.",
    chatMessages: [
      {
        id: crypto.randomUUID(),
        userId: null,
        username: "Systeme",
        text: `Room ${playerCount} joueurs creee.`,
        createdAt: new Date().toISOString(),
      },
    ],
    totalMoves: 0,
    createdAt: Date.now(),
    startedAt: null,
    statsRecorded: false,
  };

  rooms.set(room.code, room);
  return room;
};

const joinRoom = ({code, userId, username, avatarUrl}) => {
  const room = getRoom(code);

  if (!room) {
    return {error: "Room introuvable"};
  }

  const existingPlayer = room.players.find(
    (player) => player.userId === userId,
  );
  if (existingPlayer) {
    return {room, joined: false};
  }

  if (room.players.length >= room.playerCount) {
    return {error: "La room est complete"};
  }

  const usedColors = new Set(room.players.map((player) => player.color));
  const color = room.activePlayers.find((entry) => !usedColors.has(entry));

  room.players.push({userId, username, avatarUrl: avatarUrl ?? null, color});
  room.chatMessages.push({
    id: crypto.randomUUID(),
    userId: null,
    username: "Systeme",
    text: `${username} a rejoint la room.`,
    createdAt: new Date().toISOString(),
  });
  room.status =
    room.players.length === room.playerCount ? "playing" : "waiting";
  if (room.status === "playing" && !room.startedAt) {
    room.startedAt = Date.now();
  }
  room.statusMessage =
    room.status === "playing"
      ? `${room.currentPlayer} commence.`
      : `${username} a rejoint la room.`;

  return {room, joined: true};
};

const addRoomMessage = ({code, userId, username, text}) => {
  const room = getRoom(code);

  if (!room) {
    return {error: "Room introuvable"};
  }

  const player = room.players.find((entry) => entry.userId === userId);
  if (!player) {
    return {error: "Tu ne fais pas partie de cette room"};
  }

  const trimmedText = String(text ?? "").trim();
  if (!trimmedText) {
    return {error: "Message vide"};
  }

  room.chatMessages.push({
    id: crypto.randomUUID(),
    userId,
    username,
    text: trimmedText.slice(0, 300),
    createdAt: new Date().toISOString(),
  });
  room.chatMessages = room.chatMessages.slice(-40);

  return {room};
};

const rollDice = ({code, userId}) => {
  const room = getRoom(code);

  if (!room) {
    return {error: "Room introuvable"};
  }

  const player = room.players.find((entry) => entry.userId === userId);
  if (!player) {
    return {error: "Tu ne fais pas partie de cette room"};
  }

  if (room.status !== "playing") {
    return {error: "La partie n'a pas encore commence"};
  }

  if (room.currentPlayer !== player.color) {
    return {error: "Ce n'est pas ton tour"};
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
    room.statusMessage = `${player.username} a fait ${diceValue}, mais aucun pion ne peut bouger.`;
    return {room};
  }

  if (movablePawnIds.length === 1) {
    return movePawn({
      code,
      userId,
      pawnId: movablePawnIds[0],
      forcedRoll: diceValue,
    });
  }

  room.pendingRoll = diceValue;
  room.statusMessage = `${player.username} a fait ${diceValue}. Choisis un pion.`;
  return {room};
};

const movePawn = ({code, userId, pawnId, forcedRoll = null}) => {
  const room = getRoom(code);

  if (!room) {
    return {error: "Room introuvable"};
  }

  const player = room.players.find((entry) => entry.userId === userId);
  if (!player) {
    return {error: "Tu ne fais pas partie de cette room"};
  }

  if (room.currentPlayer !== player.color) {
    return {error: "Ce n'est pas ton tour"};
  }

  const roll = forcedRoll ?? room.pendingRoll;
  if (roll === null) {
    return {error: "Aucun lancer en attente"};
  }

  const movablePawnIds = getMovablePawnIds(
    room.pawnsByPlayer,
    room.currentPlayer,
    roll,
  );
  if (!movablePawnIds.includes(pawnId)) {
    return {error: "Ce pion ne peut pas bouger"};
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
    room.statusMessage = `${player.username} gagne la partie.`;
    return {room};
  }

  if (roll === 6) {
    room.statusMessage = `${player.username} rejoue grace au 6.`;
    return {room};
  }

  room.currentPlayer = getNextPlayer(room.currentPlayer, room.activePlayers);
  room.statusMessage = `Tour termine. ${room.currentPlayer} doit jouer.`;
  return {room};
};

module.exports = {
  addRoomMessage,
  createRoom,
  getRoom,
  getRoomPublicState,
  joinRoom,
  rollDice,
  movePawn,
};
