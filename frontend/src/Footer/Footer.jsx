import { Link } from 'react-router'
import './Footer.scss'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="main-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <h3>ft_transcendence</h3>
          <p>Ludo</p>
        </div>

        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/legal">Legal Notice</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms-of-service">Terms of Service</Link>
          <a href="https://github.com/rfk42/ft_transcendence" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} ft_transcendence. All rights reserved</p>
      </div>
    </footer>
  )
}

export default Footer