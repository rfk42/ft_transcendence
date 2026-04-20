import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Link, useNavigate } from 'react-router'
import './Leaderboard.scss'

const getOrdinal = (num) => {
  if (num === 1) return '1st'
  if (num === 2) return '2nd'
  if (num === 3) return '3rd'
  return `${num}th`
}

const Leaderboard = () => {
  const { user } = useAuth()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedPlayer, setSelectedPlayer] = useState(null)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/game/leaderboard')
        if (res.ok) {
          const data = await res.json()
          setPlayers(data.leaderboard)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [])

  const sortedPlayers = [...players].sort((a, b) => b.wins - a.wins)
  const topThree = sortedPlayers.slice(0, 3)
  const rest = sortedPlayers.slice(3)
  const maxWins = sortedPlayers[0]?.wins || 1

  // Trouver le rang du joueur connecté
  const currentUserRank = user
    ? sortedPlayers.find((p) => p.id === user.id) || null
    : null
  const currentUserIndex = currentUserRank
    ? sortedPlayers.indexOf(currentUserRank)
    : -1

  return (
    <section className="leaderboard-container">
      <div className="leaderboard-card">
        <div className="leaderboard-header">
          <h1>Leaderboard</h1>
        </div>

        {loading ? (
          <p className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>Loading...</p>
        ) : sortedPlayers.length === 0 ? (
          <p className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
            No ranked players yet. Play a game to appear here!
          </p>
        ) : (
          <>
            {/* Podium top 3 */}
            {topThree.length > 0 && (
              <div className="podium">
                {topThree.map((player, i) => (
                  <div key={player.id} className={`podium-card podium-${i + 1}`}>
                    <span className="podium-rank">{getOrdinal(i + 1)}</span>
                    
                    {/* On entoure l'avatar et le nom avec le Link */}
                    <Link to={`/profile/${player.id}`} style={{ textDecoration: 'none', display: 'contents' }}>
                      <div className="podium-avatar">
                        {player.avatarUrl ? (
                          <img src={player.avatarUrl} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="avatar-placeholder">{player.username[0].toUpperCase()}</span>
                        )}
                      </div>
                      <span className="podium-name">{player.username}</span>
                    </Link>

                    <span className="podium-wins">{player.wins} win{player.wins > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Rang du joueur connecté (si pas dans le top) */}
            {currentUserRank && currentUserIndex >= 3 && (
              <div className="lb-row lb-row-current">
                <span className="lb-rank">{currentUserIndex + 1}</span>
                <div className="lb-avatar">
                  {currentUserRank.avatarUrl ? (
                    <img src={currentUserRank.avatarUrl} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="avatar-placeholder">
                      {currentUserRank.username?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="lb-name">{currentUserRank.username} (you)</span>
                <div className="lb-bar-area">
                  <div
                    className="lb-bar"
                    style={{ width: `${(currentUserRank.wins / maxWins) * 100}%` }}
                  />
                </div>
                <span className="lb-wins">{currentUserRank.wins}</span>
              </div>
            )}

            {/* Liste classement (4e et +) */}
            <div className="lb-list">
              {rest.map((player, i) => {
                const rank = i + 4
                const isCurrentUser = user && player.id === user.id
                return (
                  <div key={player.id} className={`lb-row ${isCurrentUser ? 'lb-row-current' : ''}`}>
                    <span className="lb-rank">{rank}</span>
                    <Link to={`/profile/${player.id}`} className="lb-player-info-link">
                      <div className="lb-avatar">
                        {player.avatarUrl ? (
                          <img src={player.avatarUrl} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="avatar-placeholder">
                            {player.username[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="lb-name">{player.username}{isCurrentUser ? ' (you)' : ''}</span>
                    </Link>
                    <div className="lb-bar-area">
                      <div
                        className="lb-bar"
                        style={{ width: `${(player.wins / maxWins) * 100}%` }}
                      />
                    </div>
                    <span className="lb-wins">{player.wins}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default Leaderboard
