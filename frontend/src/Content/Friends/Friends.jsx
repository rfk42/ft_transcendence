import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import './Friends.scss'

const getRelationLabel = (relation) => {
  if (!relation) return 'Aucune relation'
  if (relation.status === 'accepted') return 'Déjà ami'
  if (relation.status === 'pending') {
    return relation.isSender ? 'Demande envoyée' : 'Demande reçue'
  }
  if (relation.status === 'blocked') return 'Bloqué'
  return 'Relation existante'
}

const Friends = () => {
  const { isConnected } = useAuth()
  const [friends, setFriends] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendingUserId, setSendingUserId] = useState(null)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!isConnected) {
      setFriends([])
      setUsers([])
      setLoading(false)
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setFriends([])
      setUsers([])
      setLoading(false)
      return
    }

    const headers = { Authorization: `Bearer ${token}` }

    setLoading(true)
    setError('')

    try {
      const [friendsRes, usersRes] = await Promise.all([
        fetch('/api/friends', { headers }),
        fetch('/api/friends/search', { headers }),
      ])

      if (friendsRes.ok) {
        const friendsData = await friendsRes.json()
        setFriends(friendsData.friends || [])
      } else {
        setFriends([])
      }

      const usersData = await usersRes.json()
      if (!usersRes.ok) {
        throw new Error(usersData.error || 'Impossible de charger les utilisateurs')
      }
      setUsers(usersData.users || [])
    } catch (err) {
      setError(err.message || 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  }, [isConnected])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleRemoveFriend = async (relationId) => {
    if (!window.confirm('Es-tu sûr de vouloir retirer ce joueur de tes amis ?')) return

    try {
      const res = await fetch(`/api/friends/${relationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (res.ok) {
        await loadData()
      }
    } catch (err) {
      console.error('Erreur suppression ami', err)
    }
  }

  const handleSendFriendRequest = async (targetUser) => {
    if (targetUser.relation) return

    setError('')
    setSendingUserId(targetUser.id)

    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ username: targetUser.username }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Impossible d'envoyer la demande")
      }

      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSendingUserId(null)
    }
  }

  if (!isConnected) return <div className="friends-container">Veuillez vous connecter.</div>
  if (loading)
    return <div className="friends-container">Chargement...</div>

  return (
    <div className="friends-container">
      <div className="friends-card">
        <h1 className="friends-title">Mes Amis ({friends.length})</h1>

        {friends.length === 0 ? (
          <p className="empty-friends">
            Vous n'avez pas encore d'amis. Cherchez des joueurs dans le classement !
          </p>
        ) : (
          <div className="friends-list">
            {friends.map((friend) => (
              <div key={friend.relationId} className="friend-item">
                <div className="friend-info">
                  {friend.avatarUrl ? (
                    <img src={friend.avatarUrl} alt="" className="friend-avatar" />
                  ) : (
                    <div className="friend-avatar-placeholder">
                      {friend.username[0].toUpperCase()}
                    </div>
                  )}

                  <div className="friend-details">
                    {/* Lien direct vers la page de profil de l'ami */}
                    <Link to={`/profile/${friend.id}`} className="friend-username">
                      {friend.username}
                    </Link>
                    {/* Le petit point vert ou gris pour dire s'il est en ligne */}
                    <span className={`status-indicator ${friend.isOnline ? 'online' : 'offline'}`}>
                      {friend.isOnline ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>
                </div>

                <button
                  className="remove-friend-btn"
                  onClick={() => handleRemoveFriend(friend.relationId)}
                  title="Supprimer cet ami"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}

        <section className="friends-section">
          <h2 className="friends-section-title">Tous les utilisateurs</h2>

          {error ? <p className="friends-error">{error}</p> : null}

          {users.length === 0 ? (
            <p className="empty-friends">Aucun utilisateur à afficher.</p>
          ) : (
            <div className="friends-list">
              {users.map((u) => {
                const relationLabel = getRelationLabel(u.relation)

                return (
                  <div key={u.id} className="friend-item">
                    <div className="friend-info">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="friend-avatar" />
                      ) : (
                        <div className="friend-avatar-placeholder">
                          {u.username[0].toUpperCase()}
                        </div>
                      )}

                      <div className="friend-details">
                        <Link to={`/profile/${u.id}`} className="friend-username">
                          {u.username}
                        </Link>
                        <span className={`status-indicator ${u.isOnline ? 'online' : 'offline'}`}>
                          {u.isOnline ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </div>
                    </div>

                    <div className="friend-actions">
                      {u.relation ? (
                        <span className="friend-relation-status">{relationLabel}</span>
                      ) : (
                        <button
                          className="add-friend-btn"
                          onClick={() => handleSendFriendRequest(u)}
                          disabled={sendingUserId === u.id}
                          title="Envoyer une demande"
                        >
                          {sendingUserId === u.id ? 'Envoi...' : 'Ajouter'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Friends