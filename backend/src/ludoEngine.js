const PLAYER_ORDER = ["blue", "red", "green", "yellow"];
const FINISH_PROGRESS = 57;
const MAIN_TRACK_STEPS = 36;
const TRACK_START_INDEX = {
  blue: 0,
  red: 9,
  green: 18,
  yellow: 27,
};
const SAFE_TRACK_INDEXES = new Set(Object.values(TRACK_START_INDEX));

const createInitialPawns = (playerOrder = PLAYER_ORDER) =>
  Object.fromEntries(
    playerOrder.map((color) => [
      color,
      Array.from({ length: 4 }, (_, index) => ({
        id: `${color}-${index}`,
        color,
        homeSlot: index,
        progress: -1,
      })),
    ])
  );

const getPlayersForCount = (count) => {
  if (count === 2) {
    return ["blue", "green"];
  }

  return PLAYER_ORDER.slice(0, count);
};

const getNextPlayer = (player, playerOrder = PLAYER_ORDER) => {
  const currentIndex = playerOrder.indexOf(player);
  return playerOrder[(currentIndex + 1) % playerOrder.length];
};

const canMovePawn = (progress, steps) => {
  if (progress === FINISH_PROGRESS) {
    return false;
  }

  if (progress < 0) {
    return steps === 6;
  }

  return progress + steps <= FINISH_PROGRESS;
};

const getMovablePawnIds = (pawnsByPlayer, player, steps) =>
  (pawnsByPlayer[player] ?? [])
    .filter((pawn) => canMovePawn(pawn.progress, steps))
    .map((pawn) => pawn.id);

const getTrackIndex = (pawn) => {
  if (pawn.progress < 0 || pawn.progress >= MAIN_TRACK_STEPS) {
    return null;
  }

  return (TRACK_START_INDEX[pawn.color] + pawn.progress) % MAIN_TRACK_STEPS;
};

const sendOpponentsHome = (pawnsByPlayer, movedPawn, playerOrder = PLAYER_ORDER) => {
  const movedTrackIndex = getTrackIndex(movedPawn);

  if (movedTrackIndex === null || SAFE_TRACK_INDEXES.has(movedTrackIndex)) {
    return pawnsByPlayer;
  }

  return Object.fromEntries(
    playerOrder.map((color) => [
      color,
      (pawnsByPlayer[color] ?? []).map((pawn) => {
        if (color === movedPawn.color) {
          return pawn;
        }

        return getTrackIndex(pawn) === movedTrackIndex
          ? { ...pawn, progress: -1 }
          : pawn;
      }),
    ])
  );
};

const applyPawnMove = (pawnsByPlayer, pawnId, steps, playerOrder = PLAYER_ORDER) => {
  let movedPawn = null;

  const movedState = Object.fromEntries(
    playerOrder.map((color) => [
      color,
      (pawnsByPlayer[color] ?? []).map((pawn) => {
        if (pawn.id !== pawnId) {
          return pawn;
        }

        const nextProgress = pawn.progress < 0 ? 0 : pawn.progress + steps;
        movedPawn = { ...pawn, progress: nextProgress };
        return movedPawn;
      }),
    ])
  );

  const nextState = sendOpponentsHome(movedState, movedPawn, playerOrder);

  return {
    pawns: nextState,
    movedPawn,
    winner:
      movedPawn &&
      nextState[movedPawn.color].every((pawn) => pawn.progress === FINISH_PROGRESS)
        ? movedPawn.color
        : null,
  };
};

module.exports = {
  PLAYER_ORDER,
  createInitialPawns,
  getPlayersForCount,
  getNextPlayer,
  getMovablePawnIds,
  applyPawnMove,
};
