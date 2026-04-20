import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import './Friends.scss'

const getRelationLabel = (relation) => {
  if (!relation) return 'No relation'
  if (relation.status === 'accepted') return 'Already friends'
  if (relation.status === 'pending') {
    return relation.isSender ? 'Friend request sent' : 'Friend request received'
  }
  if (relation.status === 'blocked') return 'Blocked'
  return 'Existing relation'
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
        throw new Error(usersData.error || 'Unable to load users')
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
    if (!window.confirm('Are you sure you want to remove this player from your friends?')) return

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

  if (!isConnected) return <div className="friends-container">Please log in.</div>
  if (loading)
    return <div className="friends-container">Loading...</div>

  return (
    <div className="friends-container">
      <div className="friends-card">
        <h1 className="friends-title">My friends ({friends.length})</h1>

        {friends.length === 0 ? (
          <p className="empty-friends">You have no friends yet. Search for players in the leaderboard!
           
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
                      {friend.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                <button
                  className="remove-friend-btn"
                  onClick={() => handleRemoveFriend(friend.relationId)}
                  title="Remove this friend"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <section className="friends-section">
          <h2 className="friends-section-title">All users</h2>

          {error ? <p className="friends-error">{error}</p> : null}

          {users.length === 0 ? (
            <p className="empty-friends">No users to display.</p>
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
                          {u.isOnline ? 'Online' : 'Offline'}
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
                          title="Send friend request"
                        >
                          {sendingUserId === u.id ? 'Sending...' : 'Add'}
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