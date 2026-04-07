import { useRef, useState } from 'react'
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

  const username = user?.username || 'Utilisateur'

  const handleSave = async () => {
    const trimmed = newUsername.trim()
    if (trimmed === user?.username) {
      setEditing(false)
      return
    }
    if (trimmed.length < 3 || trimmed.length > 24) {
      setError('Le pseudo doit faire entre 3 et 24 caractères')
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
        setError(data.error || 'Erreur lors de la mise à jour')
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
            <img
              src={user?.avatarUrl || '/default-avatar.png'}
              alt=""
              className="profile-avatar"
              referrerPolicy="no-referrer"
            />
            <span className="avatar-overlay"><EditIcon size={18} /></span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files[0]
                if (file) console.log('Fichier sélectionné :', file.name)
                // TODO: envoyer le fichier au backend
              }}
              hidden
            />
          </div>
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
                  Annuler
                </button>
              </div>
            ) : (
              <div className="profile-edit-row">
                <h1>{username}</h1>
                <button className="profile-edit-btn" onClick={() => setEditing(true)}>
                  Modifier
                </button>
              </div>
            )}
            {error && <p className="profile-error">{error}</p>}
          </div>
        </div>
    
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
