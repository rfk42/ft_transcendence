const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Servir les avatars uploadés en statique
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/ping", (req, res) => {
  res.json({ ok: true, message: "pong" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend listening on ${PORT}`);
});

const authRoutes = require("./routes/auth")
app.use("/auth", authRoutes)