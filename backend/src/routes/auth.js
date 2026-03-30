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
    if (!user) return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect" })

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

module.exports = router