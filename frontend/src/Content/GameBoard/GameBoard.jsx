import './GameBoard.scss'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import DiceOne from '../../assets/icons/dice_one.jsx'
import DiceTwo from '../../assets/icons/dice_two.jsx'
import DiceThree from '../../assets/icons/dice_three.jsx'
import DiceFour from '../../assets/icons/dice_four.jsx'
import DiceFive from '../../assets/icons/dice_five.jsx'
import DiceSix from '../../assets/icons/dice_six.jsx'
import MusicOffIcon from '../../assets/icons/MusicOffIcon.jsx'
import MusicOnIcon from '../../assets/icons/MusicOnIcon.jsx'
import music from '../../assets/sound/theme.mp3'
import {
  BASE_CIRCLES,
  PLAYER_LABELS,
  PLAYER_ORDER,
  SEGMENT_SQUARES,
} from './boardConfig.jsx'
import {
  applyPawnMove,
  buildMovePath,
  createInitialPawns,
  flattenPawns,
  getMovablePawnIds,
  getNextPlayer,
} from './gameRules.jsx'
import { useBoardTargets } from './useBoardTargets.jsx'
import { CenterTargets, PawnOverlay, TargetGroup } from './BoardParts.jsx'
import RoomChat from './RoomChat.jsx'

const STEP_ANIMATION_MS = 170
const ROOM_POLL_MS = 1500
const DICE_ROLL_MIN_MS = 650
const AI_TURN_DELAY_MS = 700

const DICE_ICONS = {
  1: DiceOne,
  2: DiceTwo,
  3: DiceThree,
  4: DiceFour,
  5: DiceFive,
  6: DiceSix,
}

const getPlayersForCount = (count) => {
  if (count === 2) {
    return ['blue', 'green']
  }

  return PLAYER_ORDER.slice(0, count)
}

const clonePawnsByPlayer = (pawnsByPlayer, playerOrder) =>
  Object.fromEntries(
    playerOrder.map((color) => [
      color,
      (pawnsByPlayer[color] ?? []).map((pawn) => ({ ...pawn })),
    ]),
  )

const updatePawnProgress = (pawnsByPlayer, pawnId, nextProgress, playerOrder) =>
  Object.fromEntries(
    playerOrder.map((color) => [
      color,
      (pawnsByPlayer[color] ?? []).map((pawn) =>
        pawn.id === pawnId ? { ...pawn, progress: nextProgress } : pawn,
      ),
    ]),
  )

const wait = (duration) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, duration)
  })

const getPlayerInitials = (username = '') =>
  username
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

const findMovedPawnBetweenStates = (previousPawns, nextPawns, playerOrder) => {
  for (const color of playerOrder) {
    const previousColorPawns = previousPawns[color] ?? []
    const nextColorPawns = nextPawns[color] ?? []

    for (const nextPawn of nextColorPawns) {
      const previousPawn = previousColorPawns.find(
        (pawn) => pawn.id === nextPawn.id,
      )
      if (!previousPawn || previousPawn.progress === nextPawn.progress) {
        continue
      }

      if (nextPawn.progress > previousPawn.progress) {
        return {
          pawnId: nextPawn.id,
          fromProgress: previousPawn.progress,
          toProgress: nextPawn.progress,
        }
      }
    }
  }

  return null
}

const pickComputerPawn = (pawnsByPlayer, playerColor, roll, playerOrder) => {
  const options = getMovablePawnIds(pawnsByPlayer, playerColor, roll)
  if (options.length === 0) {
    return null
  }

  const scoredOptions = options.map((pawnId) => {
    const pawn = (pawnsByPlayer[playerColor] ?? []).find((entry) => entry.id === pawnId)
    const result = applyPawnMove(pawnsByPlayer, pawnId, roll, playerOrder)
    const movedPawn = result.movedPawn

    const opponentsBefore = playerOrder
      .filter((color) => color !== playerColor)
      .flatMap((color) => pawnsByPlayer[color] ?? [])
    const opponentsAfter = playerOrder
      .filter((color) => color !== playerColor)
      .flatMap((color) => result.pawns[color] ?? [])

    const captures = opponentsBefore.filter((beforePawn) => {
      const afterPawn = opponentsAfter.find((entry) => entry.id === beforePawn.id)
      return beforePawn.progress >= 0 && afterPawn?.progress === -1
    }).length

    let score = movedPawn.progress
    if (captures > 0) score += 100
    if (movedPawn.progress === 0 && pawn?.progress < 0) score += 25
    if (result.winner) score += 1000
    if (roll === 6) score += 10

    return { pawnId, score }
  })

  scoredOptions.sort((left, right) => right.score - left.score)
  return scoredOptions[0]?.pawnId ?? options[0]
}

const fetchRoomRequest = async (token, code) => {
  const response = await fetch(`/api/game/rooms/${code}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Impossible de charger la room')
  }

  return data.room
}

const joinRoomRequest = async (token, code) => {
  const response = await fetch(`/api/game/rooms/${code}/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Impossible de rejoindre la room')
  }

  return data.room
}

const roomActionRequest = async (token, code, action, body = null) => {
  const response = await fetch(`/api/game/rooms/${code}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : null,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Action failed')
  }

  return data.room
}

const PlayerBadge = ({ color, player }) => (
  <div className={`game-board-player game-board-player--${color}`}>
    {player?.avatarUrl ? (
      <img
        src={player.avatarUrl}
        alt=""
        className="game-board-player_avatar"
        referrerPolicy="no-referrer"
      />
    ) : (
      <div className="game-board-player_avatar game-board-player_avatar--fallback">
        {getPlayerInitials(player?.username)}
      </div>
    )}
    <div className="game-board-player_info">
      <strong>{player?.username ?? 'Waiting'}</strong>
      <span>{PLAYER_LABELS[color]}</span>
    </div>
  </div>
)

const VictoryOverlay = ({ winnerColor, winnerName }) => (
  <div className={`game-board-victory game-board-victory--${winnerColor}`}>
    <div className="game-board-victory_glow" aria-hidden="true"></div>
    <div className="game-board-victory_burst" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div className="game-board-victory_card">
      <p className="game-board-victory_label">Victory</p>
      <h2>{winnerName}</h2>
      <p className="game-board-victory_subtitle">
        {PLAYER_LABELS[winnerColor]} reaches the center.
      </p>
    </div>
  </div>
)

const AI_PLAYERS = [
  { color: 'blue', username: 'You', avatarUrl: null },
  { color: 'green', username: 'Computer', avatarUrl: null },
]

const GameBoard = ({ mode = 'solo' }) => {
  const { user } = useAuth()
  const { code } = useParams()
  const audioRef = useRef(null)
  const animationRunRef = useRef(0)
  const roomBusyRef = useRef(false)
  const isRollingDiceRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [boardReady, setBoardReady] = useState(false)
  const [playerCount, setPlayerCount] = useState(4)
  const [currentPlayer, setCurrentPlayer] = useState('blue')
  const [lastRoll, setLastRoll] = useState(null)
  const [pendingRoll, setPendingRoll] = useState(null)
  const [winner, setWinner] = useState(null)
  const [statusMessage, setStatusMessage] = useState(
    'Roll the dice to start the game.',
  )
  const [pawnsByPlayer, setPawnsByPlayer] = useState(() =>
    createInitialPawns(PLAYER_ORDER),
  )
  const [animatedPawnsByPlayer, setAnimatedPawnsByPlayer] = useState(null)
  const [animatingPawnId, setAnimatingPawnId] = useState(null)
  const [gameId, setGameId] = useState(null)
  const gameStartRef = useRef(null)
  const [roomState, setRoomState] = useState(null)
  const [roomBusy, setRoomBusy] = useState(false)
  const [roomError, setRoomError] = useState('')
  const [chatMessage, setChatMessage] = useState('')
  const previousRoomStateRef = useRef(null)
  const diceIntervalRef = useRef(null)
  const [rollingFace, setRollingFace] = useState(1)
  const [isRollingDice, setIsRollingDice] = useState(false)

  const isMultiplayer = mode === 'multi'
  const isComputerGame = mode === 'ai'
  const activePlayers = isMultiplayer
    ? (roomState?.activePlayers ?? [])
    : isComputerGame
      ? ['blue', 'green']
      : getPlayersForCount(playerCount)
  const visiblePawnsByPlayer = animatedPawnsByPlayer ?? pawnsByPlayer
  const displayPawnsByPlayer = isMultiplayer
    ? (animatedPawnsByPlayer ??
      roomState?.pawnsByPlayer ??
      createInitialPawns(activePlayers))
    : visiblePawnsByPlayer
  const displayPawns = flattenPawns(displayPawnsByPlayer, activePlayers)
  const displayCurrentPlayer = isMultiplayer
    ? (roomState?.currentPlayer ?? 'blue')
    : currentPlayer
  const displayLastRoll = isMultiplayer ? roomState?.lastRoll : lastRoll
  const displayPendingRoll = isMultiplayer
    ? roomState?.pendingRoll
    : pendingRoll
  const displayWinner = isMultiplayer ? roomState?.winner : winner
  const winningPlayer = isMultiplayer
    ? roomState?.players?.find((player) => player.color === displayWinner)
    : null
  const winnerName =
    winningPlayer?.username ??
    (displayWinner ? PLAYER_LABELS[displayWinner] : '')
  const myColor = roomState?.me?.color ?? null
  const humanColor = isComputerGame ? 'blue' : myColor
  const isMyTurn = isMultiplayer ? myColor === displayCurrentPlayer : displayCurrentPlayer === humanColor
  const movablePawnIds = isMultiplayer
    ? (roomState?.movablePawnIds ?? [])
    : pendingRoll === null || winner || animatingPawnId || !boardReady
      ? []
      : getMovablePawnIds(pawnsByPlayer, currentPlayer, pendingRoll)

  const minimalStatusMessage = displayWinner
    ? `${PLAYER_LABELS[displayWinner]} won.`
    : isMultiplayer && roomState?.status === 'waiting'
      ? 'Waiting for players'
      : isMyTurn
        ? 'Your turn'
        : 'Waiting for opponent'
  const displayedDieValue = isRollingDice ? rollingFace : (displayLastRoll ?? 1)
  const DisplayedDieIcon = DICE_ICONS[displayedDieValue] ?? DiceOne
  const roomChatMessages = roomState?.chatMessages ?? []

  const { boardRef, pawnPositions, registerTarget } =
    useBoardTargets(displayPawns)

  const createGameInDB = useCallback(
    async (playerColor, count) => {
      if (!user?.token) return null
      try {
        const res = await fetch('/api/game', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ playerCount: count, playerColor }),
        })
        if (!res.ok) return null
        const data = await res.json()
        return data.game?.id || null
      } catch {
        return null
      }
    },
    [user],
  )

  const finishGameInDB = useCallback(
    async (gId, winnerColor, players) => {
      if (!user?.token || !gId) return
      try {
        const duration = gameStartRef.current
          ? Math.round((Date.now() - gameStartRef.current) / 1000)
          : 0
        await fetch(`/api/game/${gId}/finish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            winnerColor,
            players,
            duration,
          }),
        })
      } catch {
        // ignore silently
      }
    },
    [user],
  )

  useEffect(() => {
    roomBusyRef.current = roomBusy
  }, [roomBusy])

  useEffect(() => {
    isRollingDiceRef.current = isRollingDice
  }, [isRollingDice])

  useEffect(() => {
    return () => {
      animationRunRef.current += 1
      if (diceIntervalRef.current) {
        window.clearInterval(diceIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isMultiplayer || isComputerGame || !user?.token) return

    const initGame = async () => {
      const players = getPlayersForCount(playerCount)
      const id = await createGameInDB(players[0], playerCount)
      setGameId(id)
      gameStartRef.current = Date.now()
    }

    initGame()
  }, [createGameInDB, isComputerGame, isMultiplayer, playerCount, user])

  useEffect(() => {
    if (!isComputerGame || winner || pendingRoll !== null || animatingPawnId || !boardReady) {
      return undefined
    }

    if (currentPlayer !== 'green') {
      return undefined
    }

    let cancelled = false

    const playComputerTurn = async () => {
      await wait(AI_TURN_DELAY_MS)
      if (cancelled || currentPlayer !== 'green') {
        return
      }

      const diceValue = Math.floor(Math.random() * 6) + 1
      const startedAt = startDiceRolling()
      await stopDiceRolling(diceValue, startedAt)

      if (cancelled) {
        return
      }

      const nextMovable = getMovablePawnIds(pawnsByPlayer, currentPlayer, diceValue)
      setLastRoll(diceValue)

      if (nextMovable.length === 0) {
        const nextPlayer = getNextPlayer(currentPlayer, activePlayers)
        setStatusMessage(
          `${PLAYER_LABELS[currentPlayer]} rolled ${diceValue}, but no pawn can move.`,
        )
        setCurrentPlayer(nextPlayer)
        return
      }

      const pawnId =
        nextMovable.length === 1
          ? nextMovable[0]
          : pickComputerPawn(pawnsByPlayer, currentPlayer, diceValue, activePlayers)

      if (!pawnId) {
        const nextPlayer = getNextPlayer(currentPlayer, activePlayers)
        setCurrentPlayer(nextPlayer)
        return
      }

      await playPawn(pawnId, diceValue)
    }

    void playComputerTurn()

    return () => {
      cancelled = true
    }
  }, [
    activePlayers,
    animatingPawnId,
    boardReady,
    currentPlayer,
    isComputerGame,
    pawnsByPlayer,
    pendingRoll,
    winner,
  ])

  useEffect(() => {
    if (!isMultiplayer || !user?.token || !code) {
      return undefined
    }

    let active = true

    const syncRoom = async (shouldJoin = false) => {
      try {
        const room = shouldJoin
          ? await joinRoomRequest(user.token, code)
          : await fetchRoomRequest(user.token, code)

        if (active) {
          if (
            !shouldJoin &&
            (roomBusyRef.current || isRollingDiceRef.current)
          ) {
            return
          }
          setRoomState(room)
          setRoomError('')
        }
      } catch (error) {
        if (active) {
          setRoomError(error.message)
        }
      }
    }

    syncRoom(true)
    const intervalId = window.setInterval(() => {
      syncRoom(false)
    }, ROOM_POLL_MS)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [code, isMultiplayer, user])

  useEffect(() => {
    if (!isMultiplayer || !roomState?.pawnsByPlayer) {
      previousRoomStateRef.current = roomState
      return
    }

    const previousRoomState = previousRoomStateRef.current
    previousRoomStateRef.current = roomState

    if (!previousRoomState?.pawnsByPlayer) {
      return
    }

    const movedPawn = findMovedPawnBetweenStates(
      previousRoomState.pawnsByPlayer,
      roomState.pawnsByPlayer,
      roomState.activePlayers ?? [],
    )

    if (!movedPawn) {
      return
    }

    const path = buildMovePath(movedPawn.fromProgress, movedPawn.toProgress)
    if (path.length === 0) {
      return
    }

    const expectedStepCount = roomState.lastRoll ?? previousRoomState.lastRoll ?? null
    if (expectedStepCount !== null && path.length > expectedStepCount) {
      setAnimatedPawnsByPlayer(null)
      setAnimatingPawnId(null)
      return
    }

    const runId = ++animationRunRef.current
    let nextAnimatedState = clonePawnsByPlayer(
      previousRoomState.pawnsByPlayer,
      roomState.activePlayers ?? [],
    )

    const animateRoomMove = async () => {
      setAnimatingPawnId(movedPawn.pawnId)
      setAnimatedPawnsByPlayer(nextAnimatedState)

      for (const progress of path) {
        if (animationRunRef.current !== runId) {
          return
        }

        nextAnimatedState = updatePawnProgress(
          nextAnimatedState,
          movedPawn.pawnId,
          progress,
          roomState.activePlayers ?? [],
        )
        setAnimatedPawnsByPlayer(nextAnimatedState)
        await wait(STEP_ANIMATION_MS)
      }

      if (animationRunRef.current !== runId) {
        return
      }

      setAnimatedPawnsByPlayer(roomState.pawnsByPlayer)
      await wait(Math.round(STEP_ANIMATION_MS * 0.8))

      if (animationRunRef.current !== runId) {
        return
      }

      setAnimatedPawnsByPlayer(null)
      setAnimatingPawnId(null)
    }

    void animateRoomMove()
  }, [isMultiplayer, roomState])

  useEffect(() => {
    const boardNode = boardRef.current

    if (!boardNode) {
      return undefined
    }

    const { animationDuration, animationName } =
      window.getComputedStyle(boardNode)

    if (animationName === 'none' || animationDuration === '0s') {
      setBoardReady(true)
      return undefined
    }

    const handleAnimationEnd = (event) => {
      if (event.target === boardNode) {
        setBoardReady(true)
      }
    }

    boardNode.addEventListener('animationend', handleAnimationEnd)

    return () => {
      boardNode.removeEventListener('animationend', handleAnimationEnd)
    }
  }, [boardRef])

  const toggleMusic = async () => {
    if (!audioRef.current) {
      return
    }

    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
      return
    }

    try {
      await audioRef.current.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  const startDiceRolling = () => {
    if (diceIntervalRef.current) {
      window.clearInterval(diceIntervalRef.current)
    }

    setIsRollingDice(true)
    setRollingFace(1)

    let currentFace = 1
    diceIntervalRef.current = window.setInterval(() => {
      currentFace = currentFace === 6 ? 1 : currentFace + 1
      setRollingFace(currentFace)
    }, 90)

    return Date.now()
  }

  const stopDiceRolling = async (finalFace, startedAt) => {
    const elapsed = Date.now() - startedAt
    const remaining = Math.max(0, DICE_ROLL_MIN_MS - elapsed)

    if (remaining > 0) {
      await wait(remaining)
    }

    if (diceIntervalRef.current) {
      window.clearInterval(diceIntervalRef.current)
      diceIntervalRef.current = null
    }

    setRollingFace(finalFace)
    setIsRollingDice(false)
  }

  const finishTurn = ({ nextPlayer, message, keepPlayer = false }) => {
    setPendingRoll(null)
    setStatusMessage(message)

    if (!keepPlayer) {
      setCurrentPlayer(nextPlayer)
    }
  }

  const animatePawnMove = async (pawnId, path, result) => {
    const runId = ++animationRunRef.current
    let nextAnimatedState = clonePawnsByPlayer(pawnsByPlayer, activePlayers)

    setPendingRoll(null)
    setAnimatingPawnId(pawnId)
    setAnimatedPawnsByPlayer(nextAnimatedState)

    for (const progress of path) {
      if (animationRunRef.current !== runId) {
        return false
      }

      nextAnimatedState = updatePawnProgress(
        nextAnimatedState,
        pawnId,
        progress,
        activePlayers,
      )
      setAnimatedPawnsByPlayer(nextAnimatedState)
      await wait(STEP_ANIMATION_MS)
    }

    if (animationRunRef.current !== runId) {
      return false
    }

    setAnimatedPawnsByPlayer(result.pawns)
    await wait(Math.round(STEP_ANIMATION_MS * 0.8))

    if (animationRunRef.current !== runId) {
      return false
    }

    setPawnsByPlayer(result.pawns)
    setAnimatedPawnsByPlayer(null)
    setAnimatingPawnId(null)
    return true
  }

  const playPawn = async (pawnId, roll) => {
    const movingPawn = (pawnsByPlayer[currentPlayer] ?? []).find(
      (pawn) => pawn.id === pawnId,
    )

    if (!movingPawn) {
      return
    }

    const result = applyPawnMove(pawnsByPlayer, pawnId, roll, activePlayers)
    const path = buildMovePath(movingPawn.progress, result.movedPawn.progress)
    const animationCompleted = await animatePawnMove(pawnId, path, result)

    if (!animationCompleted) {
      return
    }

    if (result.winner) {
      setWinner(result.winner)
      setPendingRoll(null)
      setStatusMessage(`${PLAYER_LABELS[result.winner]} won.`)

      const playersData = activePlayers.map((color) => ({
        color,
        isWinner: color === result.winner,
      }))
      finishGameInDB(gameId, result.winner, playersData)
      return
    }

    if (roll === 6) {
      finishTurn({
        nextPlayer: currentPlayer,
        keepPlayer: true,
        message: `${PLAYER_LABELS[currentPlayer]} plays again (rolled a 6).`,
      })
      return
    }

    const nextPlayer = getNextPlayer(currentPlayer, activePlayers)
    finishTurn({
      nextPlayer,
      message: `Turn over. ${PLAYER_LABELS[nextPlayer]}'s turn.`,
    })
  }

  const handleRoll = async () => {
    if (isMultiplayer) {
      if (!user?.token || !code || roomBusy || !boardReady || displayWinner) {
        return
      }

      const startedAt = startDiceRolling()
      setRoomBusy(true)
      setRoomError('')
      roomActionRequest(user.token, code, 'roll')
        .then(async (room) => {
          await stopDiceRolling(room.lastRoll ?? 1, startedAt)
          setRoomState(room)
        })
        .catch(async (error) => {
          await stopDiceRolling(displayLastRoll ?? 1, startedAt)
          setRoomError(error.message)
        })
        .finally(() => {
          setRoomBusy(false)
        })
      return
    }

    if (winner || pendingRoll !== null || animatingPawnId || !boardReady || (isComputerGame && currentPlayer !== 'blue')) {
      return
    }

    const diceValue = Math.floor(Math.random() * 6) + 1
    const startedAt = startDiceRolling()
    await stopDiceRolling(diceValue, startedAt)
    const nextMovable = getMovablePawnIds(
      pawnsByPlayer,
      currentPlayer,
      diceValue,
    )

    setLastRoll(diceValue)

    if (nextMovable.length === 0) {
      const nextPlayer = getNextPlayer(currentPlayer, activePlayers)
      setStatusMessage(
        `${PLAYER_LABELS[currentPlayer]} rolled ${diceValue}, but no pawn can move.`,
      )
      setCurrentPlayer(nextPlayer)
      return
    }

    if (nextMovable.length === 1) {
      void playPawn(nextMovable[0], diceValue)
      return
    }

    setPendingRoll(diceValue)
    setStatusMessage(
      `${PLAYER_LABELS[currentPlayer]} rolled ${diceValue}. Click a glowing pawn.`,
    )
  }

  const handlePawnClick = (pawnId) => {
    if (isMultiplayer) {
      if (
        !user?.token ||
        !code ||
        roomBusy ||
        displayPendingRoll === null ||
        !movablePawnIds.includes(pawnId)
      ) {
        return
      }

      setRoomBusy(true)
      setRoomError('')
      roomActionRequest(user.token, code, 'move', { pawnId })
        .then((room) => {
          setRoomState(room)
        })
        .catch((error) => {
          setRoomError(error.message)
        })
        .finally(() => {
          setRoomBusy(false)
        })
      return
    }

    if (
      animatingPawnId ||
      !movablePawnIds.includes(pawnId) ||
      pendingRoll === null
    ) {
      return
    }

    void playPawn(pawnId, pendingRoll)
  }

  const handleChatSubmit = async (event) => {
    event.preventDefault()

    const trimmedMessage = chatMessage.trim()
    if (
      !isMultiplayer ||
      !user?.token ||
      !code ||
      !trimmedMessage ||
      roomBusy
    ) {
      return
    }

    setRoomBusy(true)
    setRoomError('')
    try {
      const room = await roomActionRequest(user.token, code, 'chat', {
        text: trimmedMessage,
      })
      setRoomState(room)
      setChatMessage('')
    } catch (error) {
      setRoomError(error.message)
    } finally {
      setRoomBusy(false)
    }
  }

  return (
    <section className="game-board-shell">
      <div className="game-board-stage">
        {isMultiplayer || isComputerGame
          ? activePlayers.map((color) => (
            <PlayerBadge
              key={color}
              color={color}
              player={
                isMultiplayer
                  ? roomState?.players?.find((player) => player.color === color)
                  : AI_PLAYERS.find((player) => player.color === color)
              }
            />
          ))
          : null}

        <div className="game-board-container" ref={boardRef}>
          <div className="game-board-top">
            <div className="game-board-top_left">
              <div className="game-board-top_left_home">
                <TargetGroup
                  targetIds={BASE_CIRCLES.blue}
                  registerTarget={registerTarget}
                  className="base-circle"
                />
              </div>
            </div>
            <div className="game-board-top_center">
              <TargetGroup
                targetIds={SEGMENT_SQUARES.top}
                registerTarget={registerTarget}
              />
            </div>
            <div className="game-board-top_right">
              <div className="game-board-top_right_home">
                <TargetGroup
                  targetIds={BASE_CIRCLES.red}
                  registerTarget={registerTarget}
                  className="base-circle"
                />
              </div>
            </div>
          </div>

          <div className="game-board-mid">
            <div className="game-board-mid_left">
              <TargetGroup
                targetIds={SEGMENT_SQUARES.left}
                registerTarget={registerTarget}
              />
            </div>
            <div className="game-board-mid_center">
              <CenterTargets registerTarget={registerTarget} />
            </div>
            <div className="game-board-mid_right">
              <TargetGroup
                targetIds={SEGMENT_SQUARES.right}
                registerTarget={registerTarget}
              />
            </div>
          </div>

          <div className="game-board-bottom">
            <div className="game-board-bottom_left">
              <div className="game-board-bottom_left_home">
                <TargetGroup
                  targetIds={BASE_CIRCLES.yellow}
                  registerTarget={registerTarget}
                  className="base-circle"
                />
              </div>
            </div>
            <div className="game-board-bottom_center">
              <TargetGroup
                targetIds={SEGMENT_SQUARES.bottom}
                registerTarget={registerTarget}
              />
            </div>
            <div className="game-board-bottom_right">
              <div className="game-board-bottom_right_home">
                <TargetGroup
                  targetIds={BASE_CIRCLES.green}
                  registerTarget={registerTarget}
                  className="base-circle"
                />
              </div>
            </div>
            <audio ref={audioRef} src={music} loop />
            <button
              onClick={toggleMusic}
              className="music_button"
              type="button"
            >
              {playing ? <MusicOnIcon /> : <MusicOffIcon />}
            </button>
          </div>

          {boardReady ? (
            <PawnOverlay
              pawns={displayPawns}
              pawnPositions={pawnPositions}
              currentPlayer={displayCurrentPlayer}
              movablePawnIds={movablePawnIds}
              onPawnClick={handlePawnClick}
            />
          ) : null}
          {displayWinner ? (
            <VictoryOverlay
              winnerColor={displayWinner}
              winnerName={winnerName}
            />
          ) : null}
        </div>
      </div>

      <div className="game-board-dice-launcher">
        <button
          type="button"
          className={`game-board-action ${isRollingDice ? 'game-board-action--rolling' : ''}`}
          onClick={() => {
            void handleRoll()
          }}
          disabled={
            isMultiplayer
              ? roomBusy ||
              !boardReady ||
              displayWinner !== null ||
              displayPendingRoll !== null ||
              !isMyTurn
              : winner !== null ||
              pendingRoll !== null ||
              animatingPawnId !== null ||
              !boardReady ||
              (isComputerGame && currentPlayer !== 'blue') ||
              isRollingDice
          }
        >
          <span className="game-board-action_die">
            <DisplayedDieIcon />
          </span>
          <span className="game-board-action_label">
            {roomBusy || animatingPawnId || isRollingDice
              ? 'Rolling...'
              : 'Roll the dice'}
          </span>
        </button>
      </div>

      {isMultiplayer ? (
        <div className="game-board-bottom-layout">
          <div className="game-board-panel game-board-panel--floating">
            <div className="game-board-panel_header">
              <div className="game-board-panel_room">
                <>
                  <p>
                    Room: <strong>{code}</strong>
                  </p>
                  <p className="game-board-panel_subtitle">
                    <strong>{minimalStatusMessage}</strong>
                  </p>
                </>
              </div>
              <Link to="/play" className="game-board-back">
                Leave room
              </Link>
            </div>

            <div className="game-board-panel_body">
              <RoomChat
                messages={roomChatMessages}
                userId={user?.id}
                value={chatMessage}
                onChange={setChatMessage}
                onSubmit={handleChatSubmit}
                disabled={!user?.token || roomBusy}
                title={
                  roomError ||
                  (displayPendingRoll !== null
                    ? 'Choose a pawn.'
                    : 'Room chat')
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default GameBoard
