const express = require("express")
const prisma = require("../db")
const authenticate = require("../middleware/auth")

const router = express.Router()

// Helper : Quand Prisma retourne un user, il peut inclure 
// des champs sensibles ou inutiles selon comment la requête est construite. 
// Plutôt que de recopier les 5 mêmes champs dans chaque route, on centralise ça ici.

function formatUser(user) {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl || null,
    isOnline: user.isOnline,
  }
}

// GET /friends — Liste des amis acceptés + demandes en attente

router.get("/", authenticate, async (req, res) => {
  try {
    // Requêtes parallèles : récupère les relations envoyées ET reçues en une seule passe
    const [sent, received] = await Promise.all([
      // Demandes envoyées par moi (je suis userId)
      prisma.friend.findMany({
        where: { userId: req.userId },
        include: {
          friend: {
            select: { id: true, username: true, avatarUrl: true, isOnline: true },
          },
        },
      }),
      // Demandes reçues par moi (je suis friendId)
      prisma.friend.findMany({
        where: { friendId: req.userId },
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true, isOnline: true },
          },
        },
      }),
    ])

    // On trie les relations par statut pour les envoyer dans des listes séparées

    // Amis acceptés (relation bidirectionnelle : status = accepted des deux côtés)
    const friends = sent
      .filter((r) => r.status === "accepted")
      .map((r) => ({ ...formatUser(r.friend), relationId: r.id }))

    // Demandes que j'ai envoyées et qui sont encore en attente
    const pendingSent = sent
      .filter((r) => r.status === "pending")
      .map((r) => ({ ...formatUser(r.friend), relationId: r.id }))

    // Demandes que j'ai reçues et qui sont encore en attente
    const pendingReceived = received
      .filter((r) => r.status === "pending")
      .map((r) => ({ ...formatUser(r.user), relationId: r.id }))

    // Utilisateurs bloqués (que j'ai bloqués)
    const blocked = sent
      .filter((r) => r.status === "blocked")
      .map((r) => ({ ...formatUser(r.friend), relationId: r.id }))

    res.json({ friends, pendingSent, pendingReceived, blocked })
  } catch (err) {
    console.error("Erreur GET /friends:", err)
    res.status(500).json({ error: "Erreur serveur" })
  }
})

// POST /friends/request — Envoyer une demande d'ami (par username) 
router.post("/request", authenticate, async (req, res) => {
  const { username } = req.body

  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "username requis" })
  }

  try {
    // Trouver l'utilisateur cible
    const target = await prisma.user.findUnique({
      where: { username: username.trim() },
    })

    if (!target) {
      return res.status(404).json({ error: "Utilisateur introuvable" })
    }

    if (target.id === req.userId) {
      return res.status(400).json({ error: "Tu ne peux pas t'ajouter toi-même" })
    }

    // Vérifie les deux sens de la relation pour éviter les doublons (A→B ou B→A)
    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId: target.id },
          { userId: target.id, friendId: req.userId },
        ],
      },
    })

    if (existing) {
      const messages = {
        accepted: "Vous êtes déjà amis",
        pending: "Demande déjà en attente",
        blocked: "Relation bloquée",
      }
      return res.status(409).json({ error: messages[existing.status] || "Relation existante" })
    }

    const relation = await prisma.friend.create({
      data: {
        userId: req.userId,
        friendId: target.id,
        status: "pending",
      },
      include: {
        friend: {
          select: { id: true, username: true, avatarUrl: true, isOnline: true },
        },
      },
    })

    res.status(201).json({
      message: "Demande envoyée",
      relation: {
        relationId: relation.id,
        ...formatUser(relation.friend),
      },
    })
  } catch (err) {
    console.error("Erreur POST /friends/request:", err)
    res.status(500).json({ error: "Erreur serveur" })
  }
})
 
// PATCH /friends/:relationId/accept — Accepter une demande reçue
router.patch("/:relationId/accept", authenticate, async (req, res) => {
  const { relationId } = req.params

  try {
    const relation = await prisma.friend.findUnique({
      where: { id: relationId },
    })

    if (!relation) {
      return res.status(404).json({ error: "Demande introuvable" })
    }

    // Seul le destinataire peut accepter
    if (relation.friendId !== req.userId) {
      return res.status(403).json({ error: "Tu n'es pas le destinataire de cette demande" })
    }

    if (relation.status !== "pending") {
      return res.status(400).json({ error: "Cette demande n'est pas en attente" })
    }

    const updated = await prisma.friend.update({
      where: { id: relationId },
      data: { status: "accepted" },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, isOnline: true },
        },
      },
    })

    res.json({ message: "Demande acceptée", friend: formatUser(updated.user) })
  } catch (err) {
    console.error("Erreur PATCH /friends/:id/accept:", err)
    res.status(500).json({ error: "Erreur serveur" })
  }
})

// PATCH /friends/:relationId/decline — Refuser une demande reçue 
router.patch("/:relationId/decline", authenticate, async (req, res) => {
  const { relationId } = req.params

  try {
    const relation = await prisma.friend.findUnique({
      where: { id: relationId },
    })

    if (!relation) {
      return res.status(404).json({ error: "Demande introuvable" })
    }

    // Seul le destinataire peut refuser
    if (relation.friendId !== req.userId) {
      return res.status(403).json({ error: "Tu n'es pas le destinataire de cette demande" })
    }

    if (relation.status !== "pending") {
      return res.status(400).json({ error: "Cette demande n'est pas en attente" })
    }

    await prisma.friend.delete({ where: { id: relationId } })

    res.json({ message: "Demande refusée" })
  } catch (err) {
    console.error("Erreur PATCH /friends/:id/decline:", err)
    res.status(500).json({ error: "Erreur serveur" })
  }
})

// 
// DELETE /friends/:relationId — Supprimer un ami ou annuler une demande
// 
router.delete("/:relationId", authenticate, async (req, res) => {
  const { relationId } = req.params

  try {
    const relation = await prisma.friend.findUnique({
      where: { id: relationId },
    })

    if (!relation) {
      return res.status(404).json({ error: "Relation introuvable" })
    }

    // Seul l'un des deux protagonistes peut supprimer
    if (relation.userId !== req.userId && relation.friendId !== req.userId) {
      return res.status(403).json({ error: "Non autorisé" })
    }

    await prisma.friend.delete({ where: { id: relationId } })

    res.json({ message: "Relation supprimée" })
  } catch (err) {
    console.error("Erreur DELETE /friends/:id:", err)
    res.status(500).json({ error: "Erreur serveur" })
  }
})

// 
// GET /friends/search?q=xxx — Chercher des utilisateurs par username
// 
router.get("/search", authenticate, async (req, res) => {
  const { q } = req.query

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: "La recherche doit faire au moins 2 caractères" })
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: q.trim(),
          mode: "insensitive",
        },
        NOT: { id: req.userId }, // exclure soi-même
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        isOnline: true,
      },
      take: 20,
    })

    // Pour chaque résultat, on récupère les relations existantes pour indiquer
    // au frontend si l'utilisateur est déjà ami, en attente, bloqué, etc.
    const relations = await prisma.friend.findMany({
      where: {
        OR: [
          { userId: req.userId, friendId: { in: users.map((u) => u.id) } },
          { friendId: req.userId, userId: { in: users.map((u) => u.id) } },
        ],
      },
    })

    // Construit un index peerId → relation pour un accès O(1) lors du mapping
    const relByPeer = {}
    for (const r of relations) {
      // Détermine l'id du « pair » : si je suis l'émetteur, le pair est friendId et vice-versa
      const peerId = r.userId === req.userId ? r.friendId : r.userId
      relByPeer[peerId] = { status: r.status, relationId: r.id, isSender: r.userId === req.userId }
    }

    const result = users.map((u) => ({
      ...u,
      relation: relByPeer[u.id] || null,
    }))

    res.json({ users: result })
  } catch (err) {
    console.error("Erreur GET /friends/search:", err)
    res.status(500).json({ error: "Erreur serveur" })
  }
})

module.exports = router
