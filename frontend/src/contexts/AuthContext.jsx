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
    localStorage.removeItem('token')
    setUser(null)
  }

  const isConnected = !loading && user !== null

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isConnected }}>
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
