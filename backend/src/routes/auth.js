const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const prisma = require("../db")
const authenticate = require("../middleware/auth")

const router = express.Router()
const FRONTEND_URL = process.env.FRONTEND_URL || "https://localhost:8443"

//  Configuration Multer (upload avatar) 
// Répertoire de destination des fichiers uploadés (configurable via env)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads")
const AVATAR_DIR = path.join(UPLOAD_DIR, "avatars")

// Crée le dossier avatars s'il n'existe pas
fs.mkdirSync(AVATAR_DIR, { recursive: true })

// Nom du fichier = <userId>-<timestamp>.<ext> pour éviter les collisions
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg"
    cb(null, `${req.userId}-${Date.now()}${ext}`)
  },
})

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Format non supporté (jpeg, png, webp uniquement)"))
    }
    cb(null, true)
  }
})

//  Helpers de validation 
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

// Retire les champs sensibles (hash du mdp, secret 2FA) avant d'envoyer le user au client
function sanitizeUser(user) {
  const { passwordHash, twofaSecret, ...safe } = user
  return safe
}

//  Routes 

//  Google OAuth 2.0 

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
    // Échange du code d'autorisation OAuth contre un access_token via l'API Google
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

    // Recherche ou création de l'utilisateur via googleId
    // Si aucun compte Google trouvé, on cherche par email pour lier un compte existant
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
        // Génère un username unique en ajoutant un suffixe numérique si nécessaire
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
            avatarUrl: profile.picture || null,
          },
        })
      }
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" })

    // Redirige vers le frontend avec le token
    res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}`)
  } catch (err) {
    console.error("Google OAuth error:", err)
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`)
  }
})

//  42 OAuth 2.0 

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
    // Échange du code d'autorisation OAuth contre un access_token via l'API 42
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

    // Extraction des infos utiles depuis le profil 42 (id, email, login, avatar)
    const ftId = String(profile.id)
    const ftEmail = profile.email
    const ftLogin = profile.login
    const ftAvatar = profile.image?.versions?.medium || profile.image?.link || null

    // Recherche ou création de l'utilisateur via fortyTwoId
    // Si pas trouvé, on cherche par email pour lier un compte existant
    let user = await prisma.user.findUnique({ where: { fortyTwoId: ftId } })
    if (!user) {
      user = await prisma.user.findUnique({ where: { email: ftEmail } })
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { fortyTwoId: ftId, avatarUrl: ftAvatar || user.avatarUrl },
        })
      } else {
        // Génère un username unique basé sur le login 42
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
            avatarUrl: ftAvatar,
          },
        })
      }
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" })
    res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}`)
  } catch (err) {
    console.error("42 OAuth error:", err)
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`)
  }
})

//  Routes classiques 

router.post("/register", async (req, res) => {
  const { email, username, password } = req.body

  const validationError = validateRegister({ email, username, password })
  if (validationError) return res.status(400).json({ error: validationError })

  try {
    // Hash bcrypt avec salt rounds = 10
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, username, passwordHash: hash }
    })
    res.status(201).json({ user: sanitizeUser(user) })
  } catch (err) {
    // P2002 = violation de contrainte unique Prisma (email ou username déjà pris)
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
    // Vérifie que le user existe ET qu'il a un mot de passe (pas un compte OAuth-only)
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

//  GET /auth/me — renvoie l'utilisateur courant à partir du token 
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" })
    res.json({ user: sanitizeUser(user) })
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" })
  }
})

//  PATCH /auth/me — modifier le profil 
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

//  POST /auth/me/avatar — upload de photo de profil 
router.post("/me/avatar", authenticate, (req, res) => {
  avatarUpload.single("avatar")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE")
        return res.status(400).json({ error: "Fichier trop volumineux (5 Mo max)" })
      return res.status(400).json({ error: err.message })
    }
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: "Aucun fichier envoyé" })

    try {
      // Supprime l'ancien fichier avatar local s'il existe (pas les URLs OAuth externes)
      const current = await prisma.user.findUnique({ where: { id: req.userId } })
      if (current?.avatarUrl?.startsWith("/uploads/avatars/")) {
        const oldPath = path.join(UPLOAD_DIR, current.avatarUrl.replace("/uploads/", ""))
        fs.unlink(oldPath, () => {}) // suppression
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`
      const user = await prisma.user.update({
        where: { id: req.userId },
        data: { avatarUrl },
      })
      res.json({ user: sanitizeUser(user) })
    } catch {
      res.status(500).json({ error: "Erreur serveur" })
    }
  })
})

//  DELETE /auth/me/avatar — supprimer sa photo de profil 
router.delete("/me/avatar", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" })

    // Supprimer le fichier local si c'est un upload local (pas une URL OAuth)
    if (user.avatarUrl?.startsWith("/uploads/avatars/")) {
      const filePath = path.join(UPLOAD_DIR, user.avatarUrl.replace("/uploads/", ""))
      fs.unlink(filePath, () => {})
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl: null },
    })
    res.json({ user: sanitizeUser(updated) })
  } catch {
    res.status(500).json({ error: "Erreur serveur" })
  }
})

module.exports = router