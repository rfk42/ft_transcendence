const jwt = require("jsonwebtoken")

/**
 Middleware qui vérifie le token JWT dans le header Authorization.
 Dans Express, un middleware reçoit toujours trois arguments : req (la requête), res (la réponse) et next.
 Si le middleware appelle next(), la requête continue son chemin vers la route suivante
 S'il n'appelle pas next() et renvoie une réponse (res.status(401)...), la requête est bloquée.
 */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" })
  }

  const token = header.split(" ")[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.userId
    next()
  } catch (err) {
    return res.status(401).json({ error: "Token invalide ou expiré" })
  }
}

module.exports = authenticate
