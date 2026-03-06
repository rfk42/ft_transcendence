import GameBoard from './GameBoard/GameBoard.jsx'
import './Content.scss'
import { BrowserRouter, Routes, Route, Link } from 'react-router'

const Content = () => (
  <section className="content-container">
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Link to="/play">
              <div className="toto-button">PLAY</div>
            </Link>
          }
        />
        <Route path="/play" element={<GameBoard />} />
      </Routes>
    </BrowserRouter>
  </section>
)

export default Content
