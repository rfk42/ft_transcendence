const express = require("express");
const path = require("path");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const isDevelopment = process.env.NODE_ENV !== "production";
app.set("trust proxy", true);
app.use(cors());
app.use(express.json());

//  Rate limiting global (500 req / 15 min par IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {error: "Too many requests, try again in a few minutes"},
  standardHeaders: true,
  legacyHeaders: false,
});
if (!isDevelopment) {
  app.use(globalLimiter);
}

//  Rate limiting strict sur l'auth (20 req / 15 min par IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {error: "Too many attempts, try again in 15 minutes"},
  standardHeaders: true,
  legacyHeaders: false,
});

// Servir les avatars uploadés en statique
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/ping", (req, res) => {
  res.json({ok: true, message: "pong"});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend listening on ${PORT}`);
});

const authRoutes = require("./routes/auth");
if (isDevelopment) {
  app.use("/auth", authRoutes);
} else {
  app.use("/auth", authLimiter, authRoutes);
}

const gameRoutes = require("./routes/game");
app.use("/game", gameRoutes);

const friendRoutes = require("./routes/friends");
app.use("/friends", friendRoutes);

const uploadRoutes = require("./routes/upload");
app.use("/upload", uploadRoutes);
