/**
 * Configuration de l'application Express
 * Ce fichier configure l'application Express avec tous les middlewares nécessaires
 * et définit les routes principales de l'API
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import session from "express-session";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import routes from "./routes/index.js";
import config from "./config.js";
import logger from "./utils/loggerUtils.js";
import { checkAuthWeb } from "./middleware/authMiddleware.js";
import crypto from "crypto";

// Recréer __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialisation de l'application Express
const app = express();

// Middleware pour parser le JSON avec gestion d'erreur
app.use(
  express.json({
    limit: "1mb", // Limite la taille des requêtes JSON
    verify: (req, res, buf, encoding) => {
      try {
        JSON.parse(buf);
      } catch (e) {
        res.status(400).json({
          success: false,
          error: "Format JSON invalide",
        });
        throw new Error("Format JSON invalide");
      }
    },
  })
);

// Middleware pour parser les données de formulaire
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Middleware pour la compression des réponses
app.use(compression());

// Middleware pour les cookies
app.use(cookieParser());

// Middleware pour les sessions
app.use(
  session({
    secret: config.session.secret,
    resave: config.session.resave,
    saveUninitialized: config.session.saveUninitialized,
    cookie: {
      secure: config.session.cookie.secure,
      maxAge: config.session.cookie.maxAge,
      sameSite: "lax",
      httpOnly: true,
    },
  })
);

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Trop de requêtes, réessayez plus tard" },
});
app.use(globalLimiter);

// Rate limiting strict pour l'authentification (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Trop de tentatives, réessayez dans 15 minutes" },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Rate limiting pour les endpoints IA (consomment des crédits API)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Trop de requêtes IA, réessayez dans une minute" },
});
app.use("/api/ai", aiLimiter);
app.use("/api/cover-letter", aiLimiter);

// Middleware pour la sécurité
if (config.server.env === "production") {
  // Générer un nonce aléatoire pour chaque requête
  app.use((req, res, next) => {
    // Générer un nonce aléatoire pour les scripts inline
    res.locals.nonce = Buffer.from(crypto.randomBytes(16)).toString("base64");
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com",
            "https://www.gstatic.com",
            "https://apis.google.com",
            "'unsafe-inline'",
            (req, res) => `'nonce-${res.locals.nonce}'`,
            "'unsafe-hashes'",
          ],
          scriptSrcAttr: ["'none'"],
          styleSrc: [
            "'self'",
            "https://fonts.googleapis.com",
            "https://cdnjs.cloudflare.com",
            "'unsafe-inline'",
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "https://cdnjs.cloudflare.com",
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https://www.gravatar.com",
            "https://lh3.googleusercontent.com",
            "https://via.placeholder.com", // Autoriser placeholder.com
            "https://placeholder.com",
          ],
          connectSrc: [
            "'self'",
            config.server.baseUrl,
            "https://identitytoolkit.googleapis.com",
            "https://securetoken.googleapis.com",
          ],
          frameSrc: ["'self'", config.firebase.projectId ? `https://${config.firebase.projectId}.firebaseapp.com` : ""].filter(Boolean),
        },
      },
    })
  );
} else {
  // En développement, utiliser une configuration CSP moins restrictive
  app.use(
    helmet({
      contentSecurityPolicy: false, // Désactiver CSP en développement
    })
  );
}

// Middleware pour gérer les CORS
app.use(
  cors({
    origin:
      config.server.env === "production"
        ? [config.server.baseUrl, /^https:\/\/([a-z0-9-]+\.)*autoapply\.com$/]
        : true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Logger les requêtes entrantes (masquage des données sensibles)
const SENSITIVE_FIELDS = ["password", "token", "secret", "authToken", "firebaseToken", "apiKey", "api_key", "private_key"];
function maskSensitiveData(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const masked = { ...obj };
  for (const key of Object.keys(masked)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      masked[key] = "[MASQUÉ]";
    }
  }
  return masked;
}

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl || req.url}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    body: req.method === "POST" || req.method === "PUT" ? maskSensitiveData(req.body) : undefined,
  });
  next();
});

// Routes API
app.use("/api", routes);

// Routes pour l'authentification web
app.get("/login", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      jwt.verify(token, config.jwt.secret, { algorithms: ["HS256"] });
      return res.redirect("/dashboard");
    } catch (error) {
      res.clearCookie("token");
    }
  }
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

app.get("/register", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      jwt.verify(token, config.jwt.secret, { algorithms: ["HS256"] });
      return res.redirect("/dashboard");
    } catch (error) {
      res.clearCookie("token");
    }
  }
  res.sendFile(path.join(__dirname, "../public/register.html"));
});

// Routes protégées par l'authentification
app.get("/dashboard", checkAuthWeb, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/dashboard.html"));
});

// Endpoint santé racine (pour l'extension Chrome)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rediriger la racine vers le dashboard si l'utilisateur est connecté, sinon vers la landing page
app.get("/", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      jwt.verify(token, config.jwt.secret, { algorithms: ["HS256"] });
      return res.redirect("/dashboard");
    } catch (error) {
      res.clearCookie("token");
    }
  }
  res.sendFile(path.join(__dirname, "../public/landing.html"));
});

app.get("/profile", checkAuthWeb, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/profile.html"));
});

// Servir les fichiers statiques avec mise en cache en production
if (config.server.env === "production") {
  app.use(
    express.static("public", {
      maxAge: "1d", // Cache d'un jour
      etag: true,
      lastModified: true,
    })
  );
} else {
  app.use(express.static("public"));
}

// Route pour toutes les autres requêtes (fallback vers index.html)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = config.server.env === "production";
  const errorMessage =
    isProduction && statusCode === 500
      ? "Une erreur est survenue sur le serveur"
      : err.message || "Erreur inconnue";

  logger.error(`Erreur ${statusCode}: ${err.message || "Erreur inconnue"}`, {
    error: isProduction ? undefined : err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
  });
});

// Middleware pour les routes non trouvées
app.use((req, res) => {
  logger.warn(`Route non trouvée: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    error: "Route non trouvée",
  });
});

export default app;
