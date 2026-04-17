import { createContext, useState, useContext, useEffect } from 'react'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Au chargement, vérifie le token auprès de l'API
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Token invalide')
        return res.json()
      })
      .then((data) => {
        setUser({ token, ...data.user })
      })
      .catch(() => {
        // Token invalide ou expiré → nettoyage
        localStorage.removeItem('token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    setUser({ token, ...userData })
  }

  const logout = () => {
    const token = localStorage.getItem('token')
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // best effort
      })
    }
    localStorage.removeItem('token')
    setUser(null)
  }

  // Heartbeat périodique pour maintenir un statut online fiable côté amis
  useEffect(() => {
    if (!user?.token) return undefined

    const sendPresence = () => {
      fetch('/api/auth/presence', {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
      }).catch(() => {
        // heartbeat silencieux
      })
    }

    sendPresence()
    const intervalId = window.setInterval(sendPresence, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [user?.token])

  const updateUser = (userData) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : prev))
  }

  const isConnected = !loading && user !== null

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, isConnected }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
