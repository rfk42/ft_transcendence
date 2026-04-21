import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import EditIcon from '../../assets/icons/edit'
import './Profile.scss'

const Profile = () => {
  const { user, updateUser } = useAuth()
  const fileInputRef = useRef(null)

  const [editing, setEditing] = useState(false)
  const [newUsername, setNewUsername] = useState(user?.username || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  
  // 🌟 NOUVEAU : Un état pour savoir si l'image a planté (erreur 404, lien mort, etc.)
  const [avatarFailed, setAvatarFailed] = useState(false)

  // Stats & historique
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)

  const username = user?.username || 'Utilisateur'

  // Charger stats et historique au montage
  useEffect(() => {
    if (!user?.token) return

    const fetchStats = async () => {
      try {
        const [statsRes, historyRes] = await Promise.all([
          fetch('/api/game/stats/me', {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          fetch('/api/game/history', {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData.stats)
        }
        if (historyRes.ok) {
          const historyData = await historyRes.json()
          setHistory(historyData.history)
        }
      } catch {
        // silently fail
      } finally {
        setLoadingStats(false)
      }
    }

    fetchStats()
  }, [user?.token])

  const [preview, setPreview] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const MAX_SIZE = 5 * 1024 * 1024 // 5 Mo

  const handleAvatarUpload = (file) => {
    if (!file) return

    // Validation client : type et taille avant d'envoyer
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Unsupported format (jpeg, png, webp only)')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('File too large (5 MB max)')
      return
    }

    // Preview immédiate avant l'envoi
    setPreview(URL.createObjectURL(file))
    setError('')
    setUploadProgress(10) // démarre à 10% pour être visible dès le début

    const formData = new FormData()
    formData.append('avatar', file)

    // XHR pour avoir la progression de l'upload
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable)
        setUploadProgress(Math.round((e.loaded / e.total) * 100))
      else
        setUploadProgress(50) // valeur par défaut si l'événement n'a pas de taille
    })

    xhr.addEventListener('load', () => {
      const data = JSON.parse(xhr.responseText)
      setUploadProgress(100) // passe à 100% visuellement
      if (xhr.status >= 200 && xhr.status < 300) {
        setAvatarFailed(false)
        updateUser(data.user)
        const img = new Image()
        img.onload = () => {
          setPreview(null)
          setUploadProgress(0)
        }
        img.src = data.user.avatarUrl
      } else {
        setError(data.error || "Erreur lors de l'upload")
        setPreview(null)
        setUploadProgress(0)
      }
    })

    xhr.addEventListener('error', () => {
      setError("Erreur lors de l'upload")
      setPreview(null)
      setUploadProgress(0)
    })

    xhr.open('POST', '/api/auth/me/avatar')
    xhr.setRequestHeader('Authorization', `Bearer ${user.token}`)
    xhr.send(formData)
  }

  const handleSave = async () => {
    const trimmed = newUsername.trim()
    if (trimmed === user?.username) {
      setEditing(false)
      return
    }
    if (trimmed.length < 3 || trimmed.length > 24) {
      setError('Username must be between 3 and 24 characters')
      return
    }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ username: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error updating profile')
        return
      }
      updateUser(data.user)
      setEditing(false)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setNewUsername(user?.username || '')
    setError('')
    setEditing(false)
  }

  return (
    <section className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar-wrapper" onClick={() => fileInputRef.current?.click()}>
            
            {/* 🌟 NOUVELLE LOGIQUE D'AFFICHAGE DE L'AVATAR */}
            {(preview || (user?.avatarUrl && !avatarFailed)) ? (
              <img
                src={preview || user?.avatarUrl}
                alt=""
                className="profile-avatar"
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)} // Si l'image casse, on passe à true
              />
            ) : (
              <div className="profile-avatar-placeholder">
                {username ? username[0].toUpperCase() : '?'}
              </div>
            )}

            <span className="avatar-overlay"><EditIcon size={18} /></span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files[0]
                if (file) {
                  setAvatarFailed(false) // On réinitialise l'erreur si on upload un nouveau fichier
                  handleAvatarUpload(file)
                }
                e.target.value = ''
              }}
              hidden
            />
          </div>
          
          {uploadProgress > 0 && (
            <div className="upload-progress">
              <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
              <span>{uploadProgress < 100 ? `${uploadProgress}%` : 'Finalisation...'}</span>
            </div>
          )}
          <div className="profile-username-area">
            {editing ? (
              <div className="profile-edit-row">
                <input
                  className="profile-edit-input"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                  disabled={saving}
                  maxLength={24}
                  autoFocus
                />
                <button className="profile-cancel-btn" onClick={handleCancel} disabled={saving}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="profile-edit-row">
                <h1>{username}</h1>
                <button className="profile-edit-btn" onClick={() => setEditing(true)}>
                  Edit
                </button>
              </div>
            )}
            {error && <p className="profile-error">{error}</p>}
          </div>
        </div>
    
        <div className="profile-info">
          <div className="profile-section">
            <h2>Statistics</h2>
            
            {loadingStats ? (
              <p className="empty-state">Loading...</p>
            ) : (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{stats?.totalGamesPlayed ?? 0}</div>
                  <div className="stat-label">Games played</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats?.gamesWon ?? 0}</div>
                  <div className="stat-label">Wins</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats?.winRate ? `${Math.round(stats.winRate)}%` : '0%'}</div>
                  <div className="stat-label">Winrate</div>
                </div>
              </div>
            )}
          </div>

          <div className="profile-section">
            <h2>Match history</h2>
            <div className="game-history">
              {loadingStats ? (
                <p className="empty-state">Loading...</p>
              ) : history.length === 0 ? (
                <p className="empty-state">No games played yet</p>
              ) : (
                <div className="history-list">
                  {history.map((game) => (
                    <div key={game.id} className={`history-item ${game.isWinner ? 'history-item--win' : 'history-item--loss'}`}>
                      <div className="history-result">
                        {game.isWinner ? '🏆 Victory' : '❌ Loss'}
                      </div>
                      <div className="history-details">
                        <span className="history-players">{game.playerCount} players</span>
                        <span className="history-color">Color: {game.playerColor}</span>
                        <span className="history-duration">
                          {game.duration > 60
                            ? `${Math.floor(game.duration / 60)}min ${game.duration % 60}s`
                            : `${game.duration}s`
                          }
                        </span>
                        <span className="history-date">
                          {new Date(game.date).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Profile
