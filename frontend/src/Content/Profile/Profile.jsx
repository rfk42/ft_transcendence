import { useAuth } from '../../contexts/AuthContext'
import './Profile.scss'

const Profile = () => {
  const { user } = useAuth()

  const username = user?.username || 'Utilisateur'

  return (
    <section className="profile-container">
      <div className="profile-card">
        <h1>{username}</h1>
    
        <div className="profile-info">
          <div className="profile-section">
            <h2>Statistiques</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">0</div>
                <div className="stat-label">Parties jouées</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">0</div>
                <div className="stat-label">Victoires</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">0%</div>
                <div className="stat-label">Taux de victoire</div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h2>Historique des jeux</h2>
            <div className="game-history">
              <p className="empty-state">Aucune partie jouée pour l'instant</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Profile
