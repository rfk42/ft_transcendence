const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const authenticate = require("../middleware/auth")

const router = express.Router()

// Répertoire de base pour les fichiers uploadés
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads")
const FILES_DIR = path.join(UPLOAD_DIR, "files")

// Crée le dossier files s'il n'existe pas
fs.mkdirSync(FILES_DIR, { recursive: true })

// Types autorisés : images + documents
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

// Stockage avec nom unique : <userId>-<timestamp>-<originalname>
const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FILES_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")
    cb(null, `${req.userId}-${Date.now()}-${safeName}`)
  },
})

const fileUpload = multer({
  storage: fileStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error("Type de fichier non supporté"))
    }
    cb(null, true)
  },
})

// POST /upload — Upload un fichier (protégé par JWT)
router.post("/", authenticate, (req, res) => {
  fileUpload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE")
        return res.status(400).json({ error: "Fichier trop volumineux (10 Mo max)" })
      return res.status(400).json({ error: err.message })
    }
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: "Aucun fichier envoyé" })

    res.status(201).json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: `/api/upload/files/${req.file.filename}`,
    })
  })
})

// GET /upload/files/:filename — Sert un fichier protégé (JWT requis)
router.get("/files/:filename", authenticate, (req, res) => {
  const { filename } = req.params

  // Empêche la traversée de répertoire
  const safeName = path.basename(filename)
  const filePath = path.join(FILES_DIR, safeName)

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Fichier introuvable" })
  }

  // Vérifie que le fichier appartient bien au user (le nom commence par son userId)
  if (!safeName.startsWith(req.userId)) {
    return res.status(403).json({ error: "Accès non autorisé" })
  }

  res.sendFile(filePath)
})

// DELETE /upload/files/:filename — Supprimer un fichier (JWT requis)
router.delete("/files/:filename", authenticate, (req, res) => {
  const { filename } = req.params
  const safeName = path.basename(filename)
  const filePath = path.join(FILES_DIR, safeName)

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Fichier introuvable" })
  }

  // Seul le propriétaire peut supprimer
  if (!safeName.startsWith(req.userId)) {
    return res.status(403).json({ error: "Accès non autorisé" })
  }

  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).json({ error: "Erreur lors de la suppression" })
    res.json({ message: "Fichier supprimé" })
  })
})

// GET /upload/my-files — Liste les fichiers du user connecté
router.get("/my-files", authenticate, (req, res) => {
  try {
    const files = fs.readdirSync(FILES_DIR)
      .filter((f) => f.startsWith(req.userId))
      .map((f) => {
        const stat = fs.statSync(path.join(FILES_DIR, f))
        return {
          filename: f,
          size: stat.size,
          url: `/api/upload/files/${f}`,
          createdAt: stat.birthtime,
        }
      })
      .sort((a, b) => b.createdAt - a.createdAt)

    res.json({ files })
  } catch {
    res.status(500).json({ error: "Erreur serveur" })
  }
})

module.exports = router
