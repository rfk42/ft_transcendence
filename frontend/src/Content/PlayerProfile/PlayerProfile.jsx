import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import './PlayerProfile.scss'
import { useAuth } from '../../contexts/AuthContext'

const PlayerProfile = () => {
  const { id } = useParams() // L'ID qui vient de l'URL
  const { user: currentUser } = useAuth()
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [friendStatus, setFriendStatus] = useState("none"); // "none", "sending", "sent"

const handleAddFriend = async () => {
  try {
    setFriendStatus("sending");
    
    // 1. L'URL n'a plus l'ID à la fin
    const res = await fetch(`/api/friends/request`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // 2. On précise qu'on envoie du JSON
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      // 3. On envoie le pseudo du joueur qu'on est en train de regarder !
      body: JSON.stringify({ username: player.username }) 
    });

    if (res.ok) {
      setFriendStatus("sent");
    } else {
      // Optionnel : tu peux lire l'erreur envoyée par ton collègue (ex: "Vous êtes déjà amis")
      const errorData = await res.json();
      console.error(errorData.error);
      setFriendStatus("none");
    }
  } catch (err) {
    setFriendStatus("none");
    console.error("Erreur demande d'ami", err);
  }
};

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true)
        
        // 1. ON DEMANDE LES INFOS DE L'ID DE L'URL UNIQUEMENT (Ton code original)
        const resPlayer = await fetch(`/api/game/user/${id}`)
        if (resPlayer.ok) {
          const data = await resPlayer.json()
          setPlayer(data)
        }

        // 2. NOUVEAU : ON VÉRIFIE LE STATUT D'AMITIÉ
        // On le fait seulement si on est connecté et qu'on regarde le profil de quelqu'un d'autre
        if (currentUser && currentUser.id !== id) {
          const resFriends = await fetch('/api/friends', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          })
          
          if (resFriends.ok) {
            const friendsData = await resFriends.json()
            
            // On fouille dans les listes renvoyées par ton collègue
            if (friendsData.friends.some(f => f.id === id)) {
              setFriendStatus("friends")
            } else if (friendsData.pendingSent.some(f => f.id === id)) {
              setFriendStatus("sent")
            } else if (friendsData.pendingReceived.some(f => f.id === id)) {
              setFriendStatus("received")
            } else {
              setFriendStatus("none")
            }
          }
        }
      } catch (err) {
        console.error("Erreur lors du fetch", err)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchPlayerData()
  }, [id, currentUser]) // <-- TRÈS IMPORTANT : Ajoute currentUser ici

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
            
            {/* On affiche le bouton uniquement si l'ID du profil est différent de l'ID du compte connecté */}
            {currentUser && currentUser.id !== id && (
              <div className="profile-actions">
                <button 
                  className={`add-friend-btn ${friendStatus}`}
                  onClick={handleAddFriend}
                  disabled={friendStatus !== "none"}
                >
                  {friendStatus === "none" && "Ajouter en ami"}
                  {friendStatus === "sending" && "Envoi..."}
                  {friendStatus === "sent" && "Demande envoyée"}
                  {friendStatus === "received" && "Demande reçue"}
                  {friendStatus === "friends" && "✓ Amis"}
                </button>
              </div>
            )}
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