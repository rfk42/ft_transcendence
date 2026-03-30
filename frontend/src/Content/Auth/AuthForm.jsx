import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import './AuthForm.scss'

const AUTH_CONTENT = {
  login: {
    title: 'Se connecter',
    subtitle: 'Connecte-toi pour jouer avec tes amis !',
    submitLabel: 'Se connecter',
    switchLabel: 'Pas encore de compte ?',
    switchLinkLabel: 'Creer un compte',
    switchTo: '/register',
    fields: [
      {
        id: 'username',
        label: "Nom d'utilisateur",
        type: 'text',
        placeholder: 'KingLudo',
      },
      {
        id: 'password',
        label: 'Mot de passe',
        type: 'password',
        placeholder: '••••••••',
      },
    ],
  },
  register: {
    title: 'Créer un compte',
    subtitle: 'Cree ton compte pour rejoindre Ludo Time !',
    submitLabel: 'Creer le compte',
    switchLabel: 'Deja inscrit ?',
    switchLinkLabel: 'Se connecter',
    switchTo: '/login',
    fields: [
      {
        id: 'username',
        label: "Nom d'utilisateur",
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
        label: 'Mot de passe',
        type: 'password',
        placeholder: '••••••••',
      },
      {
        id: 'confirmPassword',
        label: 'Confirmation du mot de passe',
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
          setError('Nom d\'utilisateur requis')
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
      const payload = mode === 'login'
        ? { username: formData.username, password: formData.password }
        : { email: formData.email, password: formData.password, username: formData.username }

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
      </div>
    </section>
  )
}

export default AuthForm
