/**
 * Routes principales de l'API
 * Ce fichier regroupe toutes les routes de l'API
 */

import express from "express";
import candidatureRoutes from "./candidatureRoutes.js";
import aiRoutes from "./aiRoutes.js";
import notionRoutes from "./notionRoutes.js";
import chatbotRoutes from "./chatbotRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import coverLetterRoutes from "./coverLetterRoutes.js";
import authRoutes from "./authRoutes.js";
import logger from "../utils/loggerUtils.js";
import config from "../config.js";
import { checkAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Middleware pour logger les requêtes API
router.use((req, res, next) => {
  logger.info(`API Request: ${req.method} ${req.originalUrl}`);
  next();
});

// Route de vérification de santé de l'API
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Routes d'authentification
router.use("/auth", authRoutes);

// Routes pour les candidatures (protégées)
router.use("/candidatures", checkAuth, candidatureRoutes);

// Routes IA (protégées)
router.use("/ai", checkAuth, aiRoutes);

// Routes pour l'intégration Notion (protégées)
router.use("/notion", checkAuth, notionRoutes);

// Routes pour le chatbot (protégées)
router.use("/chat", checkAuth, chatbotRoutes);

// Routes pour les paramètres utilisateur (protégées)
router.use("/settings", checkAuth, settingsRoutes);

// Routes pour la génération de lettres de motivation (protégées)
router.use("/cover-letter", checkAuth, coverLetterRoutes);

// Middleware pour gérer les routes non trouvées
router.use((req, res) => {
  logger.warn(`Route API non trouvée: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: "Route API non trouvée",
  });
});

export default router;
