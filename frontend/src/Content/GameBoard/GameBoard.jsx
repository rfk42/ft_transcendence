import './GameBoard.scss'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import MusicOffIcon from '../../assets/icons/MusicOffIcon.jsx'
import MusicOnIcon from '../../assets/icons/MusicOnIcon.jsx'
import music from '../../assets/sound/theme.mp3'
import {
  BASE_CIRCLES,
  FINISH_PROGRESS,
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

const PLAYER_COUNT_OPTIONS = [2, 3, 4]
const STEP_ANIMATION_MS = 170

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
      pawnsByPlayer[color].map((pawn) => ({ ...pawn })),
    ]),
  )

const updatePawnProgress = (pawnsByPlayer, pawnId, nextProgress, playerOrder) =>
  Object.fromEntries(
    playerOrder.map((color) => [
      color,
      pawnsByPlayer[color].map((pawn) =>
        pawn.id === pawnId ? { ...pawn, progress: nextProgress } : pawn,
      ),
    ]),
  )

const wait = (duration) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, duration)
  })

const GameBoard = () => {
  const { user } = useAuth()
  const audioRef = useRef(null)
  const animationRunRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [boardReady, setBoardReady] = useState(false)
  const [playerCount, setPlayerCount] = useState(4)
  const [currentPlayer, setCurrentPlayer] = useState('blue')
  const [lastRoll, setLastRoll] = useState(null)
  const [pendingRoll, setPendingRoll] = useState(null)
  const [winner, setWinner] = useState(null)
  const [statusMessage, setStatusMessage] = useState(
    'Lance le de pour commencer la partie.',
  )
  const [pawnsByPlayer, setPawnsByPlayer] = useState(() =>
    createInitialPawns(PLAYER_ORDER),
  )
  const [animatedPawnsByPlayer, setAnimatedPawnsByPlayer] = useState(null)
  const [animatingPawnId, setAnimatingPawnId] = useState(null)

  // ─── Tracking pour les stats ──────────────────────────────
  const [gameId, setGameId] = useState(null)
  const [moveCount, setMoveCount] = useState(0)
  const gameStartRef = useRef(null)

  const activePlayers = getPlayersForCount(playerCount)
  const visiblePawnsByPlayer = animatedPawnsByPlayer ?? pawnsByPlayer
  const pawns = flattenPawns(visiblePawnsByPlayer, activePlayers)
  const movablePawnIds =
    pendingRoll === null || winner || animatingPawnId || !boardReady
      ? []
      : getMovablePawnIds(pawnsByPlayer, currentPlayer, pendingRoll)

  const finishedCount = (pawnsByPlayer[currentPlayer] ?? []).filter(
    (pawn) => pawn.progress === FINISH_PROGRESS,
  ).length

  const { boardRef, pawnPositions, registerTarget } = useBoardTargets(pawns)

  useEffect(() => {
    return () => {
      animationRunRef.current += 1
    }
  }, [])

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

  // ─── Créer une partie en DB si connecté ───────────────────
  const createGameInDB = useCallback(async (playerColor) => {
    if (!user?.token) return null
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ playerCount, playerColor }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.game?.id || null
    } catch {
      return null
    }
  }, [user, playerCount])

  // ─── Enregistrer la fin de partie en DB ───────────────────
  const finishGameInDB = useCallback(async (gId, winnerColor, players) => {
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
          totalMoves: moveCount,
          duration,
        }),
      })
    } catch {
      // silently fail
    }
  }, [user, moveCount])

  const startNewGame = async (nextPlayerCount = playerCount) => {
    const nextPlayers = getPlayersForCount(nextPlayerCount)

    animationRunRef.current += 1
    setPlayerCount(nextPlayerCount)
    setCurrentPlayer(nextPlayers[0])
    setLastRoll(null)
    setPendingRoll(null)
    setWinner(null)
    setAnimatingPawnId(null)
    setAnimatedPawnsByPlayer(null)
    setMoveCount(0)
    gameStartRef.current = Date.now()
    setStatusMessage(
      `Nouvelle partie a ${nextPlayerCount} joueur${
        nextPlayerCount > 1 ? 's' : ''
      }. ${PLAYER_LABELS[nextPlayers[0]]} commence.`,
    )
    setPawnsByPlayer(createInitialPawns(nextPlayers))

    // Créer la partie en DB (le user prend la première couleur)
    const newGameId = await createGameInDB(nextPlayers[0])
    setGameId(newGameId)
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

    setMoveCount((prev) => prev + 1)

    const result = applyPawnMove(pawnsByPlayer, pawnId, roll, activePlayers)
    const path = buildMovePath(movingPawn.progress, result.movedPawn.progress)
    const animationCompleted = await animatePawnMove(pawnId, path, result)

    if (!animationCompleted) {
      return
    }

    if (result.winner) {
      setWinner(result.winner)
      setPendingRoll(null)
      setStatusMessage(`${PLAYER_LABELS[result.winner]} gagne la partie.`)

      // Enregistrer la fin de partie en DB
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
        message: `${PLAYER_LABELS[currentPlayer]} rejoue grace au 6.`,
      })
      return
    }

    const nextPlayer = getNextPlayer(currentPlayer, activePlayers)
    finishTurn({
      nextPlayer,
      message: `Tour termine. ${PLAYER_LABELS[nextPlayer]} doit jouer.`,
    })
  }

  const handleRoll = () => {
    if (winner || pendingRoll !== null || animatingPawnId || !boardReady) {
      return
    }

    const diceValue = Math.floor(Math.random() * 6) + 1
    const nextMovable = getMovablePawnIds(
      pawnsByPlayer,
      currentPlayer,
      diceValue,
    )

    setLastRoll(diceValue)

    if (nextMovable.length === 0) {
      const nextPlayer = getNextPlayer(currentPlayer, activePlayers)
      setStatusMessage(
        `${PLAYER_LABELS[currentPlayer]} a fait ${diceValue}, mais aucun pion ne peut bouger.`,
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
      `${PLAYER_LABELS[currentPlayer]} a fait ${diceValue}. Clique sur un pion lumineux.`,
    )
  }

  const handlePawnClick = (pawnId) => {
    if (
      animatingPawnId ||
      !movablePawnIds.includes(pawnId) ||
      pendingRoll === null
    ) {
      return
    }

    void playPawn(pawnId, pendingRoll)
  }

  return (
    <section className="game-board-shell">
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
          <button onClick={toggleMusic} className="music_button" type="button">
            {playing ? <MusicOnIcon /> : <MusicOffIcon />}
          </button>
        </div>

        {boardReady ? (
          <PawnOverlay
            pawns={pawns}
            pawnPositions={pawnPositions}
            currentPlayer={currentPlayer}
            movablePawnIds={movablePawnIds}
            onPawnClick={handlePawnClick}
          />
        ) : null}
      </div>

      <div className="game-board-controls">
        <div className="game-board-controls_row game-board-controls_row--players">
          {activePlayers.map((player) => (
            <div
              key={player}
              className={`turn-pill turn-pill--${player} ${
                currentPlayer === player ? 'turn-pill--active' : ''
              }`}
            >
              {PLAYER_LABELS[player]}
            </div>
          ))}
        </div>

        <div className="game-board-controls_actions">
          {PLAYER_COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => startNewGame(count)}
              disabled={playerCount === count && !winner && lastRoll === null}
            >
              {count} joueurs
            </button>
          ))}
        </div>

        <div className="game-board-controls_actions">
          <button
            type="button"
            onClick={handleRoll}
            disabled={
              winner !== null ||
              pendingRoll !== null ||
              animatingPawnId !== null ||
              !boardReady
            }
          >
            {animatingPawnId ? 'Deplacement...' : 'Lancer le de'}
          </button>
          <button type="button" onClick={() => startNewGame(playerCount)}>
            Nouvelle partie
          </button>
        </div>

        <div className="game-board-status">
          <p>
            Joueurs actifs: <strong>{activePlayers.length}</strong>
          </p>
          <p>
            Plateau pret: <strong>{boardReady ? 'Oui' : 'Non'}</strong>
          </p>
          <p>
            Tour actif: <strong>{PLAYER_LABELS[currentPlayer]}</strong>
          </p>
          <p>
            Dernier de: <strong>{lastRoll ?? '-'}</strong>
          </p>
          <p>
            Pion a choisir: <strong>{pendingRoll ? 'Oui' : 'Non'}</strong>
          </p>
          <p>
            Animation en cours:{' '}
            <strong>{animatingPawnId ? 'Oui' : 'Non'}</strong>
          </p>
          <p>
            Pions au centre: <strong>{finishedCount}/4</strong>
          </p>
          <p>
            Etat: <strong>{statusMessage}</strong>
          </p>
        </div>
      </div>
    </section>
  )
}

export default GameBoard
