import { Link } from 'react-router'
import AccountIcon from '../assets/icons/account.jsx'
import LoginIcon from '../assets/icons/login.jsx'
import LogoutIcon from '../assets/icons/logout.jsx'
import MenuIcon from '../assets/icons/menu.jsx'
import './Header.scss'

const Header = () => (
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
      <Link to="/register" className="header-link" aria-label="Register">
        <AccountIcon />
      </Link>
      <Link to="/login" className="header-link" aria-label="Login">
        <LoginIcon />
      </Link>
      <button type="button" className="header-icon-button" aria-label="Logout">
        <LogoutIcon />
      </button>
    </div>
  </header>
)

export default Header
