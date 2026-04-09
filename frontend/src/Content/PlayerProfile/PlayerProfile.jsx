import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import './PlayerProfile.scss'

const PlayerProfile = () => {
  const { id } = useParams() // L'ID qui vient de l'URL
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true)
        // ON DEMANDE LES INFOS DE L'ID DE L'URL UNIQUEMENT
        const res = await fetch(`/api/game/user/${id}`)
        if (res.ok) {
          const data = await res.json()
          setPlayer(data)
        }
      } catch (err) {
        console.error("Erreur lors du fetch", err)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchPlayerData()
  }, [id])

  if (loading) return <div className="profile-container">Chargement...</div>
  if (!player) return <div className="profile-container">Joueur non trouvé</div>

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar-wrapper">
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt="" className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">
                {player.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-info">
            <h1 className="profile-username">{player.username}</h1>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat-box">
            <span className="stat-value">{player.wins}</span>
            <span className="stat-label">Victoires</span>
          </div>

          <div className="stat-box">
            <span className="stat-value">{player.gamesPlayed}</span>
            <span className="stat-label">Parties</span>
          </div>

          <div className="stat-box">
            <span className="stat-value">
              {player.gamesPlayed > 0 
                ? Math.round((player.wins / player.gamesPlayed) * 100) 
                : 0}%
            </span>
            <span className="stat-label">Winrate</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerProfile