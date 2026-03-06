import AccountIcon from '../assets/icons/account.jsx'
import LoginIcon from '../assets/icons/login.jsx'
import LogoutIcon from '../assets/icons/logout.jsx'
import MenuIcon from '../assets/icons/menu.jsx'
import './Header.scss'

const Header = () => (
  <header className="header-container">
    <div className="header-left">
      <button className="burger">
        <MenuIcon />
      </button>
    </div>
    <div className="header-right">
      <button className="account">
        <AccountIcon />
      </button>
      <button className="login">
        <LoginIcon />
      </button>
      <button className="logout">
        <LogoutIcon />
      </button>
    </div>
  </header>
)

export default Header
