import './GameBoard.scss'
import { useRef, useState } from 'react'
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
  createInitialPawns,
  flattenPawns,
  getMovablePawnIds,
  getNextPlayer,
} from './gameRules.jsx'
import { useBoardTargets } from './useBoardTargets.jsx'
import { CenterTargets, PawnOverlay, TargetGroup } from './BoardParts.jsx'

const INITIAL_PAWNS = createInitialPawns()

const GameBoard = () => {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentPlayer, setCurrentPlayer] = useState('blue')
  const [lastRoll, setLastRoll] = useState(null)
  const [pendingRoll, setPendingRoll] = useState(null)
  const [winner, setWinner] = useState(null)
  const [statusMessage, setStatusMessage] = useState(
    'Lance le de pour commencer la partie.',
  )
  const [pawnsByPlayer, setPawnsByPlayer] = useState(INITIAL_PAWNS)

  const pawns = flattenPawns(pawnsByPlayer)
  const movablePawnIds =
    pendingRoll === null || winner
      ? []
      : getMovablePawnIds(pawnsByPlayer, currentPlayer, pendingRoll)

  const finishedCount = pawnsByPlayer[currentPlayer].filter(
    (pawn) => pawn.progress === FINISH_PROGRESS,
  ).length

  const { boardRef, pawnPositions, registerTarget } = useBoardTargets(pawns)

  const toggleMusic = () => {
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }

    setPlaying(!playing)
  }

  const finishTurn = ({ nextPlayer, message, keepPlayer = false }) => {
    setPendingRoll(null)
    setStatusMessage(message)

    if (!keepPlayer) {
      setCurrentPlayer(nextPlayer)
    }
  }

  const playPawn = (pawnId, roll) => {
    const result = applyPawnMove(pawnsByPlayer, pawnId, roll)
    setPawnsByPlayer(result.pawns)

    if (result.winner) {
      setWinner(result.winner)
      setPendingRoll(null)
      setStatusMessage(`${PLAYER_LABELS[result.winner]} gagne la partie.`)
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

    const nextPlayer = getNextPlayer(currentPlayer)
    finishTurn({
      nextPlayer,
      message: `Tour termine. ${PLAYER_LABELS[nextPlayer]} doit jouer.`,
    })
  }

  const handleRoll = () => {
    if (winner || pendingRoll !== null) {
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
      const nextPlayer = getNextPlayer(currentPlayer)
      setStatusMessage(
        `${PLAYER_LABELS[currentPlayer]} a fait ${diceValue}, mais aucun pion ne peut bouger.`,
      )
      setCurrentPlayer(nextPlayer)
      return
    }

    if (nextMovable.length === 1) {
      playPawn(nextMovable[0], diceValue)
      return
    }

    setPendingRoll(diceValue)
    setStatusMessage(
      `${PLAYER_LABELS[currentPlayer]} a fait ${diceValue}. Clique sur un pion lumineux.`,
    )
  }

  const handlePawnClick = (pawnId) => {
    if (!movablePawnIds.includes(pawnId) || pendingRoll === null) {
      return
    }

    playPawn(pawnId, pendingRoll)
  }

  const resetGame = () => {
    setCurrentPlayer('blue')
    setLastRoll(null)
    setPendingRoll(null)
    setWinner(null)
    setStatusMessage('La partie a ete reinitialisee.')
    setPawnsByPlayer(createInitialPawns())
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

        <PawnOverlay
          pawns={pawns}
          pawnPositions={pawnPositions}
          currentPlayer={currentPlayer}
          movablePawnIds={movablePawnIds}
          onPawnClick={handlePawnClick}
        />
      </div>

      <div className="game-board-controls">
        <div className="game-board-controls_row game-board-controls_row--players">
          {PLAYER_ORDER.map((player) => (
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
          <button
            type="button"
            onClick={handleRoll}
            disabled={winner !== null || pendingRoll !== null}
          >
            Lancer le de
          </button>
          <button type="button" onClick={resetGame}>
            Nouvelle partie
          </button>
        </div>

        <div className="game-board-status">
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
