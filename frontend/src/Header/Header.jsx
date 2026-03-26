import { Link, useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import MenuIcon from '../assets/icons/menu.jsx'
import './Header.scss'

const Header = () => {
  const { isConnected, loading, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="header-container">
      <div className="header-left">
        <button
          type="button"
          className="header-icon-button"
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
      </div>

      <div className="header-right">
        {loading ? null : isConnected ? (
          <>
            <Link to="/profile" className="header-text-button" aria-label="Profile">
              PROFIL
            </Link>
            <button
              type="button"
              className="header-text-button"
              aria-label="Logout"
              onClick={handleLogout}
            >
              LOGOUT
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="header-text-button" aria-label="Login">
              LOGIN
            </Link>
            <Link to="/register" className="header-text-button" aria-label="Sign up">
              SIGN UP
            </Link>
          </>
        )}
      </div>
    </header>
  )
}

export default Header
