import { Link } from 'react-router'
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

  return (
    <section className="auth-card-container">
      <div className="auth-card">
        <p className="auth-eyebrow">Ludo Time</p>
        <h1>{content.title}</h1>
        <p className="auth-subtitle">{content.subtitle}</p>

        <form className="auth-form">
          {content.fields.map((field) => (
            <label key={field.id} className="auth-field" htmlFor={field.id}>
              <span>{field.label}</span>
              <input
                id={field.id}
                name={field.id}
                type={field.type}
                placeholder={field.placeholder}
                autoComplete="off"
              />
            </label>
          ))}

          <button type="submit" className="auth-submit">
            {content.submitLabel}
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
