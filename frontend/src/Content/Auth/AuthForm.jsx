import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import Logo42 from '../../assets/icons/logo42'
import './AuthForm.scss'

const AUTH_CONTENT = {
  login: {
    title: 'Login',
    subtitle: 'Log in to play with your friends ',
    submitLabel: 'Sign in',
    switchLabel: 'New to LudoTime ?',
    switchLinkLabel: 'Create an account',
    switchTo: '/register',
    fields: [
      {
        id: 'username',
        label: "Username",
        type: 'text',
        placeholder: 'KingLudo',
      },
      {
        id: 'password',
        label: 'Password',
        type: 'password',
        placeholder: '••••••••',
      },
    ],
  },
  register: {
    title: 'Create your LudoTime account',
    subtitle: 'Create an account to join Ludo Time !',
    submitLabel: 'Create an account',
    switchLabel: 'Already registered ?',
    switchLinkLabel: 'Sign in',
    switchTo: '/login',
    fields: [
      {
        id: 'username',
        label: "Username",
        type: 'text',
        placeholder: 'KingLudo',
      },
      {
        id: 'email',
        label: 'Email',
        type: 'email',
        placeholder: 'player@ludo.gg',
      },
      {
        id: 'password',
        label: 'Password',
        type: 'password',
        placeholder: '••••••••',
      },
      {
        id: 'confirmPassword',
        label: 'Confirm your password',
        type: 'password',
        placeholder: '••••••••',
      },
    ],
  },
}

const AuthForm = ({ mode = 'login' }) => {
  const content = AUTH_CONTENT[mode]
  const navigate = useNavigate()
  const { login } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: '',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validation pour register
      if (mode === 'register') {
        if (!formData.username) {
          setError("Nom d'utilisateur requis")
          setLoading(false)
          return
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Les mots de passe ne correspondent pas')
          setLoading(false)
          return
        }
      }

      // Préparation des données selon le mode
      const payload =
        mode === 'login'
          ? { username: formData.username, password: formData.password }
          : {
              email: formData.email,
              password: formData.password,
              username: formData.username,
            }

      // Appel à l'API
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const response = await fetch(`/api${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Une erreur est survenue')
        setLoading(false)
        return
      }

      // Stockage du token
      if (data.token) {
        login(data.token, data.user)
      }

      // Redirection
      navigate('/')
    } catch (err) {
      setError(err.message || 'Erreur de connexion')
      setLoading(false)
    }
  }

  return (
    <section className="auth-card-container">
      <div className="auth-card">
        <p className="auth-eyebrow">Ludo Time</p>
        <h1>{content.title}</h1>
        <p className="auth-subtitle">{content.subtitle}</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {content.fields.map((field) => (
            <label key={field.id} className="auth-field" htmlFor={field.id}>
              <span>{field.label}</span>
              <input
                id={field.id}
                name={field.id}
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.id]}
                onChange={handleInputChange}
                disabled={loading}
              />
            </label>
          ))}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Chargement...' : content.submitLabel}
          </button>
        </form>

        <p className="auth-switch">
          {content.switchLabel}{' '}
          <Link to={content.switchTo}>{content.switchLinkLabel}</Link>
        </p>

        <div className="auth-divider">
          <span>ou</span>
        </div>

        <a href="/api/auth/google" className="auth-google-btn">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </a>

        <a href="/api/auth/42" className="auth-42-btn">
          <Logo42 width={20} />
          Sign in with 42
        </a>
      </div>
    </section>
  )
}

export default AuthForm
