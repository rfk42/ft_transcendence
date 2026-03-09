import './GameBoard.scss'
import { useRef, useEffect, useState } from 'react'
import PawnIcon from '../../assets/icons/pawn.jsx'
import MusicOffIcon from '../../assets/icons/MusicOffIcon.jsx'
import MusicOnIcon from '../../assets/icons/MusicOnIcon.jsx'
import music from '../../assets/sound/theme.mp3'

const GameBoard = () => {
  const pawnRef = useRef(null)
  const topCenterRef = useRef()
  const topLeftRef = useRef()
  const topRightRef = useRef()
  const midLeftRef = useRef()
  const midCenterRef = useRef()
  const midRightRef = useRef()
  const bottomLeftRef = useRef()
  const bottomCenterRef = useRef()
  const bottomRightRef = useRef()
  const squareArea = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const squaresRef = useRef([])
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  const toggleMusic = () => {
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  useEffect(() => {
    console.log('Pos', topCenterRef.current.getBoundingClientRect())
    console.log('yeahhh', topCenterRef.current.children)
  }, [])

  return (
    <section className="game-board-container">
      <div className="game-board-top">
        <div className="game-board-top_left">
          <div className="game-board-top_left_home" ref={topLeftRef}>
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
        <div className="game-board-top_center" ref={topCenterRef}>
          {squareArea.map((i) => (
            <div key={i} className="square"></div>
          ))}
        </div>
        <div className="game-board-top_right">
          <div className="game-board-top_right_home" ref={topRightRef}>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
          </div>
        </div>
      </div>

      <div className="game-board-mid">
        <div className="game-board-mid_left" ref={midLeftRef}>
          {squareArea.map((i) => (
            <div key={i} className="square" ref={squaresRef}></div>
          ))}
        </div>
        <div className="game-board-mid_center" ref={midCenterRef}>
          <div className="game-board-mid_center_win-zone"></div>
          <div className="game-board-mid_center_win-zone"></div>
          <div className="game-board-mid_center_win-zone"></div>
          <div className="game-board-mid_center_win-zone"></div>
        </div>
        <div className="game-board-mid_right" ref={midRightRef}>
          {squareArea.map((i) => (
            <div key={i} className="square"></div>
          ))}
        </div>
      </div>

      <div className="game-board-bottom">
        <div className="game-board-bottom_left">
          <div className="game-board-bottom_left_home" ref={bottomLeftRef}>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
          </div>
        </div>
        <div className="game-board-bottom_center" ref={bottomCenterRef}>
          {squareArea.map((i) => (
            <div key={i} className="square"></div>
          ))}
        </div>
        <div className="game-board-bottom_right">
          <div className="game-board-bottom_right_home" ref={bottomRightRef}>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
          </div>
        </div>
        <audio ref={audioRef} src={music} loop />
        <button onClick={toggleMusic} className="music_button">
          {playing ? <MusicOnIcon /> : <MusicOffIcon />}
        </button>
      </div>
    </section>
  )
}

export default GameBoard
