const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const prisma = require("../db")
const authenticate = require("../middleware/auth")

const router = express.Router()

// ── Helpers de validation ──────────────────────────────────
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
  return null
}

function validateLogin({ username, password }) {
  if (!username || !password) return "Nom d'utilisateur et mot de passe requis"
  return null
}

// Utilitaire pour retirer le passwordHash d'un objet user
function sanitizeUser(user) {
  const { passwordHash, twofaSecret, ...safe } = user
  return safe
}

// ── Routes ─────────────────────────────────────────────────

// ── Google OAuth 2.0 ───────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://localhost:8443/api/auth/google/callback"

router.get("/google", (req, res) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

router.get("/google/callback", async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: "Code manquant" })

  try {
    // Échange du code contre un access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) return res.status(401).json({ error: "Échec de l'échange du code Google" })

    // Récupération des infos utilisateur
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await userInfoRes.json()
    if (!userInfoRes.ok) return res.status(401).json({ error: "Impossible de récupérer le profil Google" })

    // Recherche ou création de l'utilisateur
    let user = await prisma.user.findUnique({ where: { googleId: profile.id } })
    if (!user) {
      // Vérifie si un compte existe déjà avec cet email
      user = await prisma.user.findUnique({ where: { email: profile.email } })
      if (user) {
        // Lie le compte Google au compte existant
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.id, avatarUrl: profile.picture || user.avatarUrl },
        })
      } else {
        // Crée un nouveau compte
        const baseUsername = profile.name?.replace(/\s+/g, "") || profile.email.split("@")[0]
        let username = baseUsername
        let suffix = 1
        while (await prisma.user.findUnique({ where: { username } })) {
          username = `${baseUsername}${suffix++}`
        }
        user = await prisma.user.create({
          data: {
            email: profile.email,
            username,
            googleId: profile.id,
            firstName: profile.given_name || null,
            lastName: profile.family_name || null,
            avatarUrl: profile.picture || null,
          },
        })
      }
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" })

    // Redirige vers le frontend avec le token
    res.redirect(`https://localhost:8443/oauth/callback?token=${token}`)
  } catch (err) {
    console.error("Google OAuth error:", err)
    res.redirect(`https://localhost:8443/login?error=oauth_failed`)
  }
})

// ── 42 OAuth 2.0 ──────────────────────────────────────────

const FT_CLIENT_ID = process.env.FT_CLIENT_ID
const FT_CLIENT_SECRET = process.env.FT_CLIENT_SECRET
const FT_REDIRECT_URI = process.env.FT_REDIRECT_URI || "https://localhost:8443/api/auth/42/callback"

router.get("/42", (req, res) => {
  const params = new URLSearchParams({
    client_id: FT_CLIENT_ID,
    redirect_uri: FT_REDIRECT_URI,
    response_type: "code",
    scope: "public",
  })
  res.redirect(`https://api.intra.42.fr/oauth/authorize?${params}`)
})

router.get("/42/callback", async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: "Code manquant" })

  try {
    // Échange du code contre un access token
    const tokenRes = await fetch("https://api.intra.42.fr/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: FT_CLIENT_ID,
        client_secret: FT_CLIENT_SECRET,
        redirect_uri: FT_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) return res.status(401).json({ error: "Échec de l'échange du code 42" })

    // Récupération des infos utilisateur
    const userInfoRes = await fetch("https://api.intra.42.fr/v2/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await userInfoRes.json()
    if (!userInfoRes.ok) return res.status(401).json({ error: "Impossible de récupérer le profil 42" })

    const ftId = String(profile.id)
    const ftEmail = profile.email
    const ftLogin = profile.login
    const ftAvatar = profile.image?.versions?.medium || profile.image?.link || null

    // Recherche ou création de l'utilisateur
    let user = await prisma.user.findUnique({ where: { fortyTwoId: ftId } })
    if (!user) {
      user = await prisma.user.findUnique({ where: { email: ftEmail } })
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { fortyTwoId: ftId, avatarUrl: ftAvatar || user.avatarUrl },
        })
      } else {
        let username = ftLogin
        let suffix = 1
        while (await prisma.user.findUnique({ where: { username } })) {
          username = `${ftLogin}${suffix++}`
        }
        user = await prisma.user.create({
          data: {
            email: ftEmail,
            username,
            fortyTwoId: ftId,
            firstName: profile.first_name || null,
            lastName: profile.last_name || null,
            avatarUrl: ftAvatar,
          },
        })
      }
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" })
    res.redirect(`https://localhost:8443/oauth/callback?token=${token}`)
  } catch (err) {
    console.error("42 OAuth error:", err)
    res.redirect(`https://localhost:8443/login?error=oauth_failed`)
  }
})

// ── Routes classiques ──────────────────────────────────────

router.post("/register", async (req, res) => {
  const { email, username, password } = req.body

  const validationError = validateRegister({ email, username, password })
  if (validationError) return res.status(400).json({ error: validationError })

  try {
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, username, passwordHash: hash }
    })
    res.status(201).json({ user: sanitizeUser(user) })
  } catch (err) {
    if (err.code === "P2002")
      return res.status(409).json({ error: "Email ou username déjà utilisé" })
    res.status(500).json({ error: "Erreur serveur" })
  }
})

router.post("/login", async (req, res) => {
  const { username, password } = req.body

  const validationError = validateLogin({ username, password })
  if (validationError) return res.status(400).json({ error: validationError })

  try {
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user || !user.passwordHash) return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect" })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect" })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" })
    res.json({ token, user: sanitizeUser(user) })
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" })
  }
})

// ── GET /auth/me — renvoie l'utilisateur courant à partir du token ──
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" })
    res.json({ user: sanitizeUser(user) })
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" })
  }
})

// ── PATCH /auth/me — modifier le nom du profil ──
router.patch("/me", authenticate, async (req, res) => {
  const { username } = req.body

  if (!username || typeof username !== "string")
    return res.status(400).json({ error: "Nom d'utilisateur requis" })

  const trimmed = username.trim()
  if (trimmed.length < USERNAME_MIN || trimmed.length > USERNAME_MAX)
    return res.status(400).json({ error: `Le nom d'utilisateur doit faire entre ${USERNAME_MIN} et ${USERNAME_MAX} caractères` })

  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { username: trimmed },
    })
    res.json({ user: sanitizeUser(user) })
  } catch (err) {
    if (err.code === "P2002")
      return res.status(409).json({ error: "Ce nom d'utilisateur est déjà pris" })
    res.status(500).json({ error: "Erreur serveur" })
  }
})

module.exports = router