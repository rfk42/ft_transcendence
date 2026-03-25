import {
  CENTER_TARGETS,
  FINISH_PROGRESS,
  MAIN_TRACK_STEPS,
  PLAYER_ORDER,
  TRACK_SEQUENCE,
  TRACK_START_INDEX,
  getPawnTargetId,
} from './boardConfig.jsx'

const SAFE_TARGETS = new Set(Object.values(CENTER_TARGETS))
Object.values(TRACK_START_INDEX).forEach((index) => {
  SAFE_TARGETS.add(TRACK_SEQUENCE[index])
})

export const createInitialPawns = () =>
  Object.fromEntries(
    PLAYER_ORDER.map((color) => [
      color,
      Array.from({ length: 4 }, (_, index) => ({
        id: `${color}-${index}`,
        color,
        homeSlot: index,
        progress: -1,
      })),
    ]),
  )

export const flattenPawns = (pawnsByPlayer) =>
  PLAYER_ORDER.flatMap((color) => pawnsByPlayer[color])

export const getNextPlayer = (player) => {
  const currentIndex = PLAYER_ORDER.indexOf(player)
  return PLAYER_ORDER[(currentIndex + 1) % PLAYER_ORDER.length]
}

export const canMovePawn = (progress, steps) => {
  if (progress === FINISH_PROGRESS) {
    return false
  }

  if (progress < 0) {
    return steps === 6
  }

  return progress + steps <= FINISH_PROGRESS
}

export const getMovablePawnIds = (pawnsByPlayer, player, steps) =>
  pawnsByPlayer[player]
    .filter((pawn) => canMovePawn(pawn.progress, steps))
    .map((pawn) => pawn.id)

const sendOpponentsHome = (pawnsByPlayer, movedPawn) => {
  if (movedPawn.progress < 0 || movedPawn.progress >= MAIN_TRACK_STEPS) {
    return pawnsByPlayer
  }

  const targetId = getPawnTargetId(movedPawn)

  if (SAFE_TARGETS.has(targetId)) {
    return pawnsByPlayer
  }

  return Object.fromEntries(
    PLAYER_ORDER.map((color) => [
      color,
      pawnsByPlayer[color].map((pawn) => {
        if (color === movedPawn.color) {
          return pawn
        }

        if (pawn.progress < 0 || pawn.progress >= MAIN_TRACK_STEPS) {
          return pawn
        }

        return getPawnTargetId(pawn) === targetId
          ? { ...pawn, progress: -1 }
          : pawn
      }),
    ]),
  )
}

export const applyPawnMove = (pawnsByPlayer, pawnId, steps) => {
  let movedPawn = null

  const movedState = Object.fromEntries(
    PLAYER_ORDER.map((color) => [
      color,
      pawnsByPlayer[color].map((pawn) => {
        if (pawn.id !== pawnId) {
          return pawn
        }

        const nextProgress = pawn.progress < 0 ? 0 : pawn.progress + steps
        movedPawn = { ...pawn, progress: nextProgress }
        return movedPawn
      }),
    ]),
  )

  const nextState = sendOpponentsHome(movedState, movedPawn)

  return {
    pawns: nextState,
    movedPawn,
    winner:
      movedPawn &&
      nextState[movedPawn.color].every(
        (pawn) => pawn.progress === FINISH_PROGRESS,
      )
        ? movedPawn.color
        : null,
  }
}
