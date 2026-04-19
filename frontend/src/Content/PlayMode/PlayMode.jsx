import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import './PlayMode.scss'

const PLAYER_COUNT_OPTIONS = [2, 3, 4]

const PlayMode = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [playerCount, setPlayerCount] = useState(2)
  const [roomCode, setRoomCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleCreateRoom = async () => {
    if (!user?.token) {
      setError('Connecte-toi pour creer une room multijoueur.')
      return
    }

    setBusy(true)
    setError('')

    try {
      const response = await fetch('/api/game/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ playerCount }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de creer la room')
      }

      navigate(`/play/multi/${data.room.code}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!user?.token) {
      setError('Connecte-toi pour rejoindre une room.')
      return
    }

    if (!roomCode.trim()) {
      setError('Entre un code de room.')
      return
    }

    setBusy(true)
    setError('')

    try {
      const normalizedCode = roomCode.trim().toUpperCase()
      const response = await fetch(`/api/game/rooms/${normalizedCode}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Room introuvable')
      }

      navigate(`/play/multi/${normalizedCode}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="play-mode">
      <h1>Multijoueur</h1>
      <p>Crée une room de 2 à 4 joueurs ou rejoins-en une avec son code.</p>

      <div className="play-mode_card">
        <h2>Choisis ta room</h2>

        <div className="play-mode_actions">
          {PLAYER_COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              className={`play-mode_button ${playerCount === count ? 'play-mode_button--active' : ''}`}
              onClick={() => setPlayerCount(count)}
              disabled={busy}
            >
              {count} joueurs
            </button>
          ))}
        </div>

        <div className="play-mode_actions">
          <button
            type="button"
            className="play-mode_button"
            onClick={handleCreateRoom}
            disabled={busy}
          >
            {busy ? 'Creation...' : 'Creer une room'}
          </button>
        </div>

        <label className="play-mode_field" htmlFor="room-code">
          <span>Code de room</span>
          <input
            id="room-code"
            type="text"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder="Ex: A1B2C3"
            disabled={busy}
          />
        </label>

        <div className="play-mode_actions">
          <button
            type="button"
            className="play-mode_button"
            onClick={handleJoinRoom}
            disabled={busy}
          >
            Rejoindre une room
          </button>
        </div>

        {error ? <p className="play-mode_error">{error}</p> : null}
      </div>
    </section>
  )
}

export default PlayMode
