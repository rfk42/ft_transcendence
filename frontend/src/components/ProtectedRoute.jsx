import { Navigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

/**
 * Wrapper de route protégée.
 * Redirige vers /login si l'utilisateur n'est pas connecté.
 * Affiche un placeholder pendant le chargement initial du token.
 */
const ProtectedRoute = ({ children }) => {
  const { isConnected, loading } = useAuth()

  if (loading) return null // on attend la vérification du token

  if (!isConnected) return <Navigate to="/login" replace />

  return children
}

export default ProtectedRoute
