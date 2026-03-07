import AccountIcon from '../assets/icons/account.jsx'
import LoginIcon from '../assets/icons/login.jsx'
import LogoutIcon from '../assets/icons/logout.jsx'
import MenuIcon from '../assets/icons/menu.jsx'
import './Header.scss'

const Header = () => (
  <header className="header-container">
    <div className="header-left">
      <MenuIcon />
    </div>
    <div className="header-right">
      <AccountIcon />
      <LoginIcon />
      <LogoutIcon />
    </div>
  </header>
)

export default Header
