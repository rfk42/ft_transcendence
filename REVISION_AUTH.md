# 📚 Fiche de révision — Système d'authentification full-stack


# Architecture globale

Frontend (React + Vite) → fetch(/api/auth/...) → Nginx (reverse proxy) → proxy_pass /api → Backend (Express.js) → Prisma ORM → PostgreSQL


---


# 1. BACKEND — Middleware JWT


## Concept

Un **middleware Express** est une fonction qui s'exécute **entre** la réception de la requête et le handler de la route. Il peut :

- Bloquer la requête (avec res.status().json())
- Enrichir la requête (avec req.userId = ...)
- Passer au suivant (avec next())


## Code — backend/src/middleware/auth.js

```javascript
const jwt = require("jsonwebtoken")

const authenticate = (req, res, next) => {
  // 1. Lire le header Authorization
  const header = req.headers.authorization
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" })
  }

  // 2. Extraire le token (après "Bearer ")
  const token = header.split(" ")[1]

  try {
    // 3. Vérifier la signature + expiration
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    // 4. Attacher le userId à la requête pour les routes suivantes
    req.userId = payload.userId
    next() // ✅ Passe à la route
  } catch (err) {
    return res.status(401).json({ error: "Token invalide ou expiré" })
  }
}

module.exports = authenticate
```


## Points clés

- **Bearer** → Convention standard pour envoyer un JWT dans le header HTTP
- **jwt.verify()** → Vérifie la signature ET l'expiration automatiquement
- **next()** → Fonction Express qui passe au middleware/handler suivant
- **req.userId** → On "attache" des données à la requête pour les routes en aval


---


# 2. BACKEND — Routes d'authentification


## Concept

3 routes qui gèrent l'inscription, la connexion et la récupération du profil :

- POST /auth/register — Créer un compte
- POST /auth/login — Se connecter (reçoit un JWT)
- GET /auth/me — Récupérer ses infos (nécessite un JWT valide)


## Code — backend/src/routes/auth.js

```javascript
const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const prisma = require("../db")
const authenticate = require("../middleware/auth")

const router = express.Router()

// ── Validation ─────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN = 6
const USERNAME_MIN = 3
const USERNAME_MAX = 24

function validateRegister({ email, username, password }) {
  if (!email || !username || !password) return "Tous les champs sont requis"
  if (!EMAIL_RE.test(email)) return "Format d'email invalide"
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX)
    return `Le nom d'utilisateur doit faire entre ${USERNAME_MIN} et ${USERNAME_MAX} caractères`
  if (password.length < PASSWORD_MIN)
    return `Le mot de passe doit faire au moins ${PASSWORD_MIN} caractères`
  return null // ✅ null = pas d'erreur
}

function validateLogin({ email, password }) {
  if (!email || !password) return "Email et mot de passe requis"
  if (!EMAIL_RE.test(email)) return "Format d'email invalide"
  return null
}

// Retire les champs sensibles avant de renvoyer au client
function sanitizeUser(user) {
  const { passwordHash, twofaSecret, ...safe } = user
  return safe
}

// ── POST /auth/register ────────────────────────────────────
router.post("/register", async (req, res) => {
  const { email, username, password } = req.body

  const validationError = validateRegister({ email, username, password })
  if (validationError) return res.status(400).json({ error: validationError })

  try {
    const hash = await bcrypt.hash(password, 10) // 10 = salt rounds
    const user = await prisma.user.create({
      data: { email, username, passwordHash: hash }
    })
    res.status(201).json({ user: sanitizeUser(user) })
  } catch (err) {
    if (err.code === "P2002") // Prisma : violation contrainte UNIQUE
      return res.status(409).json({ error: "Email ou username déjà utilisé" })
    res.status(500).json({ error: "Erreur serveur" })
  }
})

// ── POST /auth/login ───────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body

  const validationError = validateLogin({ email, password })
  if (validationError) return res.status(400).json({ error: validationError })

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: "Email ou mot de passe incorrect" })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: "Email ou mot de passe incorrect" })

    // Signer un JWT valide 7 jours
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" })
    res.json({ token, user: sanitizeUser(user) })
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" })
  }
})

// ── GET /auth/me (protégé) ─────────────────────────────────
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" })
    res.json({ user: sanitizeUser(user) })
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" })
  }
})

module.exports = router
```


## Points clés

- **bcrypt.hash(password, 10)** → Hash le mot de passe avec 10 rounds de salt (irréversible)
- **bcrypt.compare(plain, hash)** → Compare un mot de passe en clair avec un hash (retourne boolean)
- **jwt.sign(payload, secret, options)** → Crée un token signé contenant le userId
- **P2002** → Code erreur Prisma pour violation de contrainte UNIQUE
- **Message d'erreur identique login** → On dit toujours "email ou mot de passe incorrect" pour ne pas révéler si l'email existe
- **sanitizeUser()** → Destructuring pour exclure passwordHash et twofaSecret de la réponse


---


# 3. FRONTEND — Context d'authentification (React)


## Concept

Le **Context API** de React permet de partager un état global sans passer des props à travers tous les composants (évite le "prop drilling"). Ici, il gère :

- L'état user (connecté ou non)
- Le loading (vérification du token en cours)
- Les fonctions login() et logout()


## Code — frontend/src/contexts/AuthContext.jsx

```javascript
import { createContext, useState, useContext, useEffect } from 'react'

// 1. Créer le contexte (conteneur vide)
const AuthContext = createContext()

// 2. Le Provider wrappe l'app et fournit les valeurs
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true = vérification en cours

  // 3. Au montage : vérifier si un token valide existe
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    // Appeler l'API pour valider le token ET récupérer les données user
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Token invalide')
        return res.json()
      })
      .then((data) => {
        setUser({ token, ...data.user }) // ✅ Restaure la session complète
      })
      .catch(() => {
        localStorage.removeItem('token') // 🗑️ Token mort → on nettoie
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

  // isConnected est true SEULEMENT quand loading est terminé ET user existe
  const isConnected = !loading && user !== null

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isConnected }}>
      {children}
    </AuthContext.Provider>
  )
}

// 4. Hook custom pour consommer le contexte facilement
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```


## Points clés

- **createContext()** → Crée un "canal" de données partagé
- **Provider** → Composant qui fournit les données à ses enfants
- **useContext()** → Hook qui consomme les données du Provider
- **useEffect(fn, [])** → S'exécute une seule fois au montage du composant
- **localStorage** → Stockage persistant côté navigateur (survit aux refresh)
- **loading** → Empêche un "flash" de l'UI non-connectée pendant la vérification
- **finally()** → S'exécute que la promesse réussisse OU échoue


## Utilisation dans n'importe quel composant

```javascript
const { user, isConnected, login, logout } = useAuth()
```


---


# 4. FRONTEND — Route protégée


## Concept

Au lieu d'appeler navigate() dans le render (anti-pattern), on wrappe les routes privées avec un composant dédié qui utilise Navigate de React Router.


## Code — frontend/src/components/ProtectedRoute.jsx

```javascript
import { Navigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { isConnected, loading } = useAuth()

  if (loading) return null       // ⏳ Attend la vérification du token
  if (!isConnected) return <Navigate to="/login" replace /> // 🔒 Redirige

  return children                // ✅ Affiche la page protégée
}

export default ProtectedRoute
```


## Utilisation dans le routage

```javascript
<Route
  path="/profile"
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  }
/>
```


## Points clés

- **Navigate replace** → Redirection déclarative de React Router (remplace l'URL dans l'historique)
- **children** → Pattern React : le contenu entre les balises ouvrante et fermante
- **return null** → Ne rien afficher pendant le chargement


---


# 5. FRONTEND — Formulaire Auth (Login + Register)


## Concept

Un **seul composant** gère les deux modes via une prop mode. La configuration des champs est déclarative (objet AUTH_CONTENT), ce qui évite de dupliquer du code.


## Pattern : configuration déclarative

```javascript
const AUTH_CONTENT = {
  login: {
    title: 'Se connecter',
    fields: [
      { id: 'email', label: 'Email', type: 'email', placeholder: 'player@ludo.gg' },
      { id: 'password', label: 'Mot de passe', type: 'password', placeholder: '••••••••' },
    ],
  },
  register: {
    title: 'Créer un compte',
    fields: [
      { id: 'username', label: "Nom d'utilisateur", type: 'text', placeholder: 'KingLudo' },
      // + email, password, confirmPassword
    ],
  },
}
```


## Pattern : rendu dynamique des champs

```javascript
{content.fields.map((field) => (
  <label key={field.id}>
    <span>{field.label}</span>
    <input
      id={field.id}
      name={field.id}          // ← utilisé par handleInputChange
      type={field.type}
      value={formData[field.id]} // ← lecture dynamique dans le state
      onChange={handleInputChange}
    />
  </label>
))}
```


## Pattern : handler générique

```javascript
const handleInputChange = (e) => {
  const { name, value } = e.target  // name = "email", "password", etc.
  setFormData((prev) => ({
    ...prev,         // garde les autres champs
    [name]: value,   // ← computed property name : met à jour le bon champ
  }))
}
```


## Soumission du formulaire

```javascript
const handleSubmit = async (e) => {
  e.preventDefault()         // Empêche le rechargement de la page

  const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    setError(data.error)     // Affiche l'erreur du backend
    return
  }

  login(data.token, data.user) // Stocke dans le contexte
  navigate('/')                // Redirige vers l'accueil
}
```


---


# 6. FRONTEND — Header conditionnel


## Concept

Le header change son contenu selon 3 états : chargement, connecté, non connecté.

```javascript
const Header = () => {
  const { isConnected, loading, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header>
      <div className="header-right">
        {loading ? null : isConnected ? (
          <>
            <Link to="/profile">PROFIL</Link>
            <button onClick={handleLogout}>LOGOUT</button>
          </>
        ) : (
          <>
            <Link to="/login">LOGIN</Link>
            <Link to="/register">SIGN UP</Link>
          </>
        )}
      </div>
    </header>
  )
}
```


## Ternaire chaîné

- loading ? null → rien pendant le chargement
- : isConnected ? (A) → boutons PROFIL + LOGOUT
- : (B) → boutons LOGIN + SIGN UP


---


# 7. Structure du Provider dans l'app

```javascript
// App.jsx
const App = () => (
  <AuthProvider>        {/* ← fournit le contexte auth à TOUT ce qui est en dessous */}
    <BrowserRouter>     {/* ← fournit le routage */}
      <Header />
      <Content />       {/* ← contient les Routes */}
      <Footer />
    </BrowserRouter>
  </AuthProvider>
)
```

⚠️ AuthProvider DOIT être au-dessus de BrowserRouter car il n'utilise pas de hook de routage. Mais tous les composants enfants peuvent utiliser les deux (auth + routing).


---


# 8. Flux complet — Séquence


## Inscription

1. User remplit le formulaire register
2. POST /api/auth/register { email, username, password }
3. Backend valide les inputs
4. bcrypt.hash(password, 10) → stocke en BDD
5. Retourne { user } (sans passwordHash)


## Connexion

1. User remplit le formulaire login
2. POST /api/auth/login { email, password }
3. Backend cherche le user par email
4. bcrypt.compare(password, hash) → vérifie le mot de passe
5. jwt.sign({ userId }, secret, { expiresIn: "7d" }) → crée le token
6. Retourne { token, user }
7. Frontend : login(token, user) → localStorage + state
8. Redirect vers /


## Rechargement de page (F5)

1. AuthContext monte → lit localStorage.token
2. GET /api/auth/me avec header Bearer token
3. Backend : jwt.verify() → cherche user en BDD
4. Retourne { user }
5. Frontend : setUser({ token, ...user })
6. OU si token expiré → catch → supprime localStorage


## Déconnexion

1. User clique LOGOUT
2. logout() → supprime localStorage + setUser(null)
3. navigate('/login')


---


# 9. Codes de statut HTTP utilisés

- **200 OK** → Login réussi, /me réussi
- **201 Created** → Register réussi
- **400 Bad Request** → Validation échouée (champs manquants, format invalide)
- **401 Unauthorized** → Token manquant/invalide, mauvais identifiants
- **404 Not Found** → Utilisateur introuvable
- **409 Conflict** → Email ou username déjà pris (contrainte UNIQUE)
- **500 Server Error** → Erreur inattendue


---


# 10. Concepts clés à retenir

- **JWT** → Token signé contenant des données (ici userId). Vérifié sans appel BDD.
- **bcrypt** → Algorithme de hachage irréversible avec salt intégré.
- **Middleware** → Fonction chaînable entre la requête et la réponse dans Express.
- **Context API** → Système React pour partager un état global sans prop drilling.
- **ProtectedRoute** → Pattern pour empêcher l'accès à une route sans authentification.
- **Ternaire chaîné** → a ? X : b ? Y : Z — remplace un if/else if/else dans du JSX.
- **Computed property** → [name]: value — clé dynamique dans un objet JS.
- **sanitizeUser()** → Destructuring pour retirer des champs sensibles avant l'envoi.
