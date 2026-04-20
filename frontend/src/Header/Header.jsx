import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import './Header.scss'

const Header = () => {
  const { user, isConnected, loading, logout } = useAuth()
  const navigate = useNavigate()

  const [pendingRequests, setPendingRequests] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)

  // Aller chercher les demandes d'ami au chargement si connecté
  useEffect(() => {
    const fetchFriendRequests = async () => {
      try {
        const res = await fetch('/api/friends', { // Vérifie s'il faut remettre /api selon ton proxy
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          // On ne garde que les demandes REÇUES et en attente
          setPendingRequests(data.pendingReceived || [])
        }
      } catch (err) {
        console.error("Erreur récupération amis", err)
      }
    }

    if (isConnected) {
      fetchFriendRequests()
    }
  }, [isConnected])

  // Fonction pour accepter ou refuser
  const handleRequestResponse = async (relationId, action) => {
    try {
      // action = 'accept' ou 'decline'
      const res = await fetch(`/api/friends/${relationId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (res.ok) {
        // Si ça marche, on retire la demande de la liste pour l'effacer de l'écran
        setPendingRequests(prev => prev.filter(req => req.relationId !== relationId))
        
        // Si c'est la dernière demande, on ferme le menu
        if (pendingRequests.length === 1) setShowDropdown(false)
      }
    } catch (err) {
      console.error(`Erreur ${action} ami`, err)
    }
  }

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
          <Link to="/leaderboard" className="header-nav-link">Leaderboard</Link>
          <Link to="/friends" className="header-nav-link">Friends</Link>
        </nav>
      </div>

      <div className="header-right">
        {loading ? null : isConnected ? (
          <>
            {/* 🔔 DEBUT DU BLOC NOTIFICATIONS (SVG Amis) */}
            <div className="header-notifications">
              <button 
                className="notifications-btn"
                onClick={() => setShowDropdown(!showDropdown)}
                aria-label="Friend requests"
              >
                {/* Ton icône SVG */}
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="icon-users"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>

                {/* Badge rouge si demandes en attente */}
                {pendingRequests.length > 0 && (
                  <span className="notifications-badge">{pendingRequests.length}</span>
                )}
              </button>

              {/* Menu déroulant */}
              {showDropdown && (
                <div className="notifications-dropdown">
                  <div className="dropdown-header">Friend requests</div>
                  
                  {pendingRequests.length === 0 ? (
                    <div className="dropdown-empty">No pending requests</div>
                  ) : (
                    <div className="dropdown-list">
                      {pendingRequests.map(req => (
                        <div key={req.relationId} className="friend-request-item">
                          <div className="request-info">
                            {req.avatarUrl ? (
                              <img src={req.avatarUrl} alt="" className="request-avatar" />
                            ) : (
                              <span className="request-avatar-placeholder">
                                {req.username[0].toUpperCase()}
                              </span>
                            )}
                            <span className="request-username">{req.username}</span>
                          </div>
                          
                          <div className="request-actions">
                            <button 
                              className="btn-accept" 
                              onClick={() => handleRequestResponse(req.relationId, 'accept')}
                              title="Accept"
                            >
                              ✓
                            </button>
                            <button 
                              className="btn-decline" 
                              onClick={() => handleRequestResponse(req.relationId, 'decline')}
                              title="Decline"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* 🔔 FIN DU BLOC NOTIFICATIONS */}

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
