import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'

const OAuthCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (error) {
      navigate('/login?error=oauth_failed')
      return
    }

    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Token invalide')
          return res.json()
        })
        .then((data) => {
          login(token, data.user)
          navigate('/')
        })
        .catch(() => {
          navigate('/login?error=oauth_failed')
        })
    } else {
      navigate('/login')
    }
  }, [searchParams, navigate, login])

  return (
    <section className="auth-card-container">
      <div className="auth-card">
        <p>Connexion en cours...</p>
      </div>
    </section>
  )
}

export default OAuthCallback
