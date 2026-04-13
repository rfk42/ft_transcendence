import { useState, useEffect } from 'react'
import { Link } from 'react-router' // Pour cliquer sur leur pseudo et aller sur leur profil
import { useAuth } from '../../contexts/AuthContext'
import './Friends.scss'

const Friends = () => {
  const { isConnected } = useAuth()
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await fetch('/api/friends', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          // Le backend renvoie { friends, pendingSent, pendingReceived, blocked }
          // On garde juste les amis validés pour cette page
          setFriends(data.friends || [])
        }
      } catch (err) {
        console.error("Erreur chargement amis", err)
      } finally {
        setLoading(false)
      }
    }

    if (isConnected) fetchFriends()
  }, [isConnected])

  // Fonction pour supprimer un ami (utilise la route DELETE de ton collègue)
  const handleRemoveFriend = async (relationId) => {
    // Petite confirmation avant de supprimer
    if (!window.confirm("Es-tu sûr de vouloir retirer ce joueur de tes amis ?")) return

    try {
      const res = await fetch(`/api/friends/${relationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (res.ok) {
        // On met à jour l'affichage en retirant l'ami de la liste
        setFriends(prev => prev.filter(f => f.relationId !== relationId))
      }
    } catch (err) {
      console.error("Erreur suppression ami", err)
    }
  }

  if (!isConnected) return <div className="friends-container">Veuillez vous connecter.</div>
  if (loading) return <div className="friends-container">Chargement de vos amis...</div>

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
            {friends.map(friend => (
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
      </div>
    </div>
  )
}

export default Friends