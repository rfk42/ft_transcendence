import GameBoard from './GameBoard/GameBoard.jsx'
import AuthForm from './Auth/AuthForm.jsx'
import OAuthCallback from './Auth/OAuthCallback.jsx'
import Profile from './Profile/Profile.jsx'
import ProfilePlayer from './PlayerProfile/PlayerProfile.jsx'
import Leaderboard from './Leaderboard/Leaderboard.jsx'
import Friends from './Friends/Friends.jsx'
import Legal from './Legal/Legal.jsx'
import PlayMode from './PlayMode/PlayMode.jsx'
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
      <Route path="/play" element={<PlayMode />} />
      <Route path="/play/solo" element={<GameBoard mode="solo" />} />
      <Route path="/play/multi/:code" element={<GameBoard mode="multi" />} />
      {/*<Route path="/room" element={<Room />} />*/}
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
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/profile/:id" element={<ProfilePlayer />} />
      <Route path="/friends" element={<Friends />} />
      <Route path="/legal" element={<Legal />} />
    </Routes>
  </section>
)

export default Content
