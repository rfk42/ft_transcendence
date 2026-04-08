import { useAuth } from '../../contexts/AuthContext'
import './Leaderboard.scss'

// Données fictives en attendant le backend
const MOCK_PLAYERS = [
  { id: '1', username: 'ProGamer42', avatarUrl: null, wins: 10, gamesPlayed: 52 },
  { id: '2', username: 'ChessKing_', avatarUrl: null, wins: 29, gamesPlayed: 55 },
  { id: '3', username: 'LudoMaster', avatarUrl: null, wins: 19, gamesPlayed: 50 },
  { id: '4', username: 'DiceRoller', avatarUrl: null, wins: 38, gamesPlayed: 49 },
  { id: '5', username: 'BoardNinja', avatarUrl: null, wins: 35, gamesPlayed: 46 },
  { id: '6', username: 'PawnStorm', avatarUrl: null, wins: 1, gamesPlayed: 48 },
  { id: '7', username: 'TokenChamp', avatarUrl: null, wins: 30, gamesPlayed: 44 },
  { id: '8', username: 'RollMaster', avatarUrl: null, wins: 28, gamesPlayed: 42 },
  { id: '9', username: 'GameWiz99', avatarUrl: null, wins: 56, gamesPlayed: 40 },
  { id: '10', username: 'LuckyPawn', avatarUrl: null, wins: 22, gamesPlayed: 38 },
]

const Leaderboard = () => {
  const { user } = useAuth()

  const sortedPlayers = [...MOCK_PLAYERS].sort((a, b) => b.wins - a.wins)

  const topThree = sortedPlayers.slice(0, 3)
  const rest = sortedPlayers.slice(3)
  const maxWins = sortedPlayers[0]?.wins || 1

  // Simule le rang du joueur connecté
  const currentUserRank = user
    ? { rank: 42, username: user.username, avatarUrl: user.avatarUrl, wins: 12, gamesPlayed: 20 }
    : null

  return (
    <section className="leaderboard-container">
      <div className="leaderboard-card">
        <div className="leaderboard-header">
          <h1>Leaderboard</h1>
        </div>

        {/* Podium top 3 */}
        <div className="podium">
            {topThree.map((player, i) => (
              <div key={player.id} className={`podium-card podium-${i + 1}`}>
                <span className="podium-rank">{i + 1}{i === 0 ? 'er' : 'e'}</span>
                <div className="podium-avatar">
                  {player.avatarUrl ? (
                    <img src={player.avatarUrl} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="avatar-placeholder">{player.username[0].toUpperCase()}</span>
                  )}
                </div>
                <span className="podium-name">{player.username}</span>
                <span className="podium-wins">{player.wins} victoires</span>
              </div>
            ))}
        </div>
        {currentUserRank && (
          <div className="lb-row lb-row-current">
            <span className="lb-rank">{currentUserRank.rank}</span>
            <div className="lb-avatar">
              {currentUserRank.avatarUrl ? (
                <img src={currentUserRank.avatarUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="avatar-placeholder">
                  {currentUserRank.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <span className="lb-name">{currentUserRank.username}</span>
            <div className="lb-bar-area">
              <div
                className="lb-bar"
                style={{ width: `${(currentUserRank.wins / maxWins) * 100}%` }}
              />
            </div>
            <span className="lb-wins">{currentUserRank.wins}</span>
          </div>
        )}

        {/* Liste classement */}
        <div className="lb-list">
          {rest.map((player, i) => {
            const rank = i + 4
            return (
              <div key={player.id} className="lb-row">
                <span className="lb-rank">{rank}</span>
                <div className="lb-avatar">
                  {player.avatarUrl ? (
                    <img src={player.avatarUrl} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="avatar-placeholder">
                      {player.username[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="lb-name">{player.username}</span>
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
      </div>
    </section>
  )
}

export default Leaderboard
