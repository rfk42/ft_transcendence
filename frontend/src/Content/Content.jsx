import GameBoard from './GameBoard/GameBoard.jsx'
import AuthForm from './Auth/AuthForm.jsx'
import OAuthCallback from './Auth/OAuthCallback.jsx'
import Profile from './Profile/Profile.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import './Content.scss'
import { Link, Route, Routes } from 'react-router'

const Content = () => (
  <section className="content-container">
    <Routes>
      <Route
        path="/"
        element={
          <Link to="/play" className="content-link">
            <div className="toto-button">PLAY</div>
          </Link>
        }
      />
      <Route path="/play" element={<GameBoard />} />
      <Route path="/login" element={<AuthForm mode="login" />} />
      <Route path="/register" element={<AuthForm mode="register" />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
    </Routes>
  </section>
)

export default Content
