export const PLAYER_ORDER = ['blue', 'red', 'green', 'yellow']

export const PLAYER_LABELS = {
  blue: 'Bleu',
  red: 'Rouge',
  green: 'Vert',
  yellow: 'Jaune',
}

export const TRACK_SEQUENCE = [
  'left-1',
  'left-2',
  'left-3',
  'top-9',
  'top-6',
  'top-3',
  'top-0',
  'top-1',
  'top-2',
  'top-5',
  'top-8',
  'top-11',
  'right-0',
  'right-1',
  'right-2',
  'right-3',
  'right-7',
  'right-11',
  'right-10',
  'right-9',
  'right-8',
  'bottom-2',
  'bottom-5',
  'bottom-8',
  'bottom-11',
  'bottom-10',
  'bottom-9',
  'bottom-6',
  'bottom-3',
  'bottom-0',
  'left-11',
  'left-10',
  'left-9',
  'left-8',
  'left-4',
  'left-0',
]

export const TRACK_START_INDEX = {
  blue: 0,
  red: 9,
  green: 18,
  yellow: 27,
}

export const HOME_LANES = {
  blue: ['left-5', 'left-6', 'left-7'],
  red: ['top-4', 'top-7', 'top-10'],
  green: ['right-4', 'right-5', 'right-6'],
  yellow: ['bottom-1', 'bottom-4', 'bottom-7'],
}

export const CENTER_TARGETS = {
  blue: 'center-blue',
  red: 'center-red',
  green: 'center-green',
  yellow: 'center-yellow',
}

export const SEGMENT_SQUARES = {
  top: Array.from({ length: 12 }, (_, index) => `top-${index}`),
  left: Array.from({ length: 12 }, (_, index) => `left-${index}`),
  right: Array.from({ length: 12 }, (_, index) => `right-${index}`),
  bottom: Array.from({ length: 12 }, (_, index) => `bottom-${index}`),
}

export const BASE_CIRCLES = {
  blue: Array.from({ length: 4 }, (_, index) => `base-blue-${index}`),
  red: Array.from({ length: 4 }, (_, index) => `base-red-${index}`),
  yellow: Array.from({ length: 4 }, (_, index) => `base-yellow-${index}`),
  green: Array.from({ length: 4 }, (_, index) => `base-green-${index}`),
}

export const MAIN_TRACK_STEPS = TRACK_SEQUENCE.length - 1
export const HOME_LENGTH = HOME_LANES.blue.length
export const FINISH_PROGRESS = MAIN_TRACK_STEPS + HOME_LENGTH

export const getBaseTargetId = (pawn) => {
  const slot = pawn.homeSlot ?? Number(pawn.id.split('-')[1])
  return `base-${pawn.color}-${slot}`
}

export const getPawnTargetId = (pawn) => {
  if (pawn.progress < 0) {
    return getBaseTargetId(pawn)
  }

  if (pawn.progress < MAIN_TRACK_STEPS) {
    return TRACK_SEQUENCE[
      (TRACK_START_INDEX[pawn.color] + pawn.progress) % TRACK_SEQUENCE.length
    ]
  }

  if (pawn.progress < FINISH_PROGRESS) {
    return HOME_LANES[pawn.color][pawn.progress - MAIN_TRACK_STEPS]
  }

  return CENTER_TARGETS[pawn.color]
}

export const getPawnStatus = (progress) => {
  if (progress < 0) {
    return 'Dans la base'
  }

  if (progress < MAIN_TRACK_STEPS) {
    return `Tour principal (${progress + 1}/${MAIN_TRACK_STEPS})`
  }

  if (progress < FINISH_PROGRESS) {
    return `Ligne d'arrivee (${progress - MAIN_TRACK_STEPS + 1}/${HOME_LENGTH})`
  }

  return 'Au centre'
}
