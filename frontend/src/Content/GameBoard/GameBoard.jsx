import './GameBoard.scss'
import { useRef, useEffect } from 'react'
import PawnIcon from '../../assets/icons/pawn.jsx'

const GameBoard = () => {
  const topLeft = useRef()
  const pawnRef = useRef(null)
  useEffect(() => {
    const svg = pawnRef.current
    if (!svg) return

    svg.style.transition = 'transform 0.6s ease'
    svg.style.transform = 'translate(15px, 148px)'

    console.log('topLeft', topLeft.current.getBoundingClientRect())
  }, [])

  const squareArea = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  return (
    <section className="game-board-container">
      <div className="game-board-top">
        <div className="game-board-top_left" ref={topLeft}>
          <div className="game-board-top_left_home">
            <div className="base-circle">
              <div ref={pawnRef}>
                <PawnIcon />
              </div>
            </div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
          </div>
        </div>
        <div className="game-board-top_center">
          {squareArea.map((i) => (
            <div key={i} className="square"></div>
          ))}
        </div>
        <div className="game-board-top_right">
          <div className="game-board-top_right_home">
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
          </div>
        </div>
      </div>

      <div className="game-board-mid">
        <div className="game-board-mid_left">
          {squareArea.map((i) => (
            <div key={i} className="square"></div>
          ))}
        </div>
        <div className="game-board-mid_center">
          <div className="game-board-mid_center_win-zone"></div>
          <div className="game-board-mid_center_win-zone"></div>
          <div className="game-board-mid_center_win-zone"></div>
          <div className="game-board-mid_center_win-zone"></div>
        </div>
        <div className="game-board-mid_right">
          {squareArea.map((i) => (
            <div key={i} className="square"></div>
          ))}
        </div>
      </div>

      <div className="game-board-bottom">
        <div className="game-board-bottom_left">
          <div className="game-board-bottom_left_home">
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
          </div>
        </div>
        <div className="game-board-bottom_center">
          {squareArea.map((i) => (
            <div key={i} className="square"></div>
          ))}
        </div>
        <div className="game-board-bottom_right">
          <div className="game-board-bottom_right_home">
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GameBoard
