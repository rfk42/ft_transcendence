import PawnIcon from '../../assets/icons/pawn.jsx'

export const TargetGroup = ({
  targetIds,
  registerTarget,
  className = 'square',
}) => (
  <>
    {targetIds.map((targetId) => (
      <div
        key={targetId}
        className={className}
        ref={registerTarget(targetId)}
      ></div>
    ))}
  </>
)

export const CenterTargets = ({ registerTarget }) => (
  <>
    <div className="game-board-mid_center_win-zone"></div>
    <div className="game-board-mid_center_win-zone"></div>
    <div className="game-board-mid_center_win-zone"></div>
    <div className="game-board-mid_center_win-zone"></div>
    <span
      className="center-target center-target--blue"
      ref={registerTarget('center-blue')}
    ></span>
    <span
      className="center-target center-target--red"
      ref={registerTarget('center-red')}
    ></span>
    <span
      className="center-target center-target--green"
      ref={registerTarget('center-green')}
    ></span>
    <span
      className="center-target center-target--yellow"
      ref={registerTarget('center-yellow')}
    ></span>
  </>
)

export const PawnOverlay = ({
  pawns,
  pawnPositions,
  currentPlayer,
  movablePawnIds,
  onPawnClick,
}) => (
  <div className="game-board-overlay" aria-label="Pions de jeu">
    {pawns.map((pawn) => {
      const isMovable = movablePawnIds.includes(pawn.id)
      const isCurrentPlayer = pawn.color === currentPlayer

      return (
        <button
          key={pawn.id}
          type="button"
          className={`pawn-token pawn-token--${pawn.color} ${
            isMovable ? 'pawn-token--movable' : ''
          } ${isCurrentPlayer ? 'pawn-token--current' : ''}`}
          style={{
            left: pawnPositions[pawn.id]
              ? `${pawnPositions[pawn.id].left}px`
              : '0px',
            top: pawnPositions[pawn.id]
              ? `${pawnPositions[pawn.id].top}px`
              : '0px',
          }}
          onClick={() => onPawnClick(pawn.id)}
          disabled={!isMovable}
          aria-label={`Pion ${pawn.id}`}
        >
          <PawnIcon />
        </button>
      )
    })}
  </div>
)
