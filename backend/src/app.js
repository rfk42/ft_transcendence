const express = require("express");
const path = require("path");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/game");
const friendRoutes = require("./routes/friends");
const uploadRoutes = require("./routes/upload");

const app = express();
const isDevelopment = process.env.NODE_ENV !== "production";

function parseAllowedOrigins() {
  const configured = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  return [
    "http://localhost:5173",
    "http://localhost:8080",
    "https://localhost:8443",
    "https://localhost:3000",
    process.env.FRONTEND_URL,
  ].filter(Boolean);
}

const allowedOrigins = new Set(parseAllowedOrigins());

app.set("trust proxy", true);

app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "media-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  );
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isDevelopment || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({limit: "1mb"}));

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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {error: "Too many attempts, try again in 15 minutes"},
  standardHeaders: true,
  legacyHeaders: false,
});

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/ping", (_req, res) => {
  res.json({ok: true, message: "pong"});
});

if (isDevelopment) {
  app.use("/auth", authRoutes);
} else {
  app.use("/auth", authLimiter, authRoutes);
}

app.use("/game", gameRoutes);
app.use("/friends", friendRoutes);
app.use("/upload", uploadRoutes);

app.use((err, _req, res, _next) => {
  console.error("Unhandled API error:", err);
  if (res.headersSent) {
    return;
  }
  res.status(500).json({error: "Internal server error"});
});

module.exports = app;
