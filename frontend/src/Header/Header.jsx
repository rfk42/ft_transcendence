import { Link, useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import './Header.scss'

const Header = () => {
  const { user, isConnected, loading, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="header-container">
      <div className="header-left">
        <Link to="/" className="header-logo">Ludo Time</Link>
        <nav className="header-nav">
          <Link to="/play" className="header-nav-link">Play</Link>
        </nav>
      </div>

      <div className="header-right">
        {loading ? null : isConnected ? (
          <>
            <Link to="/profile" className="header-profile-link" aria-label="Profile">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="header-avatar" referrerPolicy="no-referrer" />
              ) : (
                <span className="header-avatar-placeholder">{user?.username?.[0]?.toUpperCase()}</span>
              )}
              <span className="header-username">{user?.username}</span>
            </Link>
            <button
              type="button"
              className="header-logout-btn"
              aria-label="Logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="header-login-btn" aria-label="Login">
            Login
          </Link>
        )}
      </div>
    </header>
  )
}

export default Header
