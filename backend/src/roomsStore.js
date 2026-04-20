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
    return {error: "Room not found"};
  }

  const existingPlayer = room.players.find(
    (player) => player.userId === userId,
  );
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
    room.startedAt = Date.now();
  }
  room.statusMessage =
    room.status === "playing"
      ? `${room.currentPlayer} starts.`
      : `${username} joined the room.`;

  return {room, joined: true};
};

const addRoomMessage = ({code, userId, username, text}) => {
  const room = getRoom(code);

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

  return {room};
};

const rollDice = ({code, userId}) => {
  const room = getRoom(code);

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
  room.statusMessage = `${player.username} rolled ${diceValue}. Choose a pawn.`;
  return {room};
};

const movePawn = ({code, userId, pawnId, forcedRoll = null}) => {
  const room = getRoom(code);

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
    return {room};
  }

  if (roll === 6) {
    room.statusMessage = `${player.username} plays again (rolled a 6).`;
    return {room};
  }

  room.currentPlayer = getNextPlayer(room.currentPlayer, room.activePlayers);
  room.statusMessage = `Turn over. ${room.currentPlayer}'s turn.`;
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
