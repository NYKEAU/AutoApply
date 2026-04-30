/**
 * Routes pour la gestion des paramètres utilisateur
 * Ce fichier gère les routes liées aux paramètres utilisateur
 */

import express from "express";
import logger from "../utils/loggerUtils.js";
import config from "../config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Recréer __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * @route GET /api/settings
 * @description Récupère les paramètres utilisateur
 * @access Public
 */
router.get("/", async (req, res) => {
  try {
    // Renvoyer les paramètres publics (sans les tokens)
    res.json({
      success: true,
      settings: {
        notionEnabled: config.notion.enabled,
        perplexityEnabled: config.ai.perplexityEnabled,
      },
    });
  } catch (error) {
    logger.error("Erreur lors de la récupération des paramètres:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des paramètres",
    });
  }
});

/**
 * @route POST /api/settings
 * @description Enregistre les paramètres utilisateur
 * @access Public
 */
router.post("/", async (req, res) => {
  try {
    const { notionToken, notionDatabaseId, perplexityApiKey } = req.body;

    // Valider les paramètres
    if (notionToken && !notionToken.startsWith("ntn_")) {
      return res.status(400).json({
        success: false,
        error: "Format de token Notion invalide",
      });
    }

    if (notionDatabaseId && !/^[a-f0-9]{32}$/.test(notionDatabaseId)) {
      return res.status(400).json({
        success: false,
        error: "Format d'ID de base de données Notion invalide",
      });
    }

    if (perplexityApiKey && !perplexityApiKey.startsWith("pplx-")) {
      return res.status(400).json({
        success: false,
        error: "Format de clé API Perplexity invalide",
      });
    }

    // Créer un fichier de configuration temporaire pour cette session
    const sessionSettings = {
      notionToken: notionToken || "",
      notionDatabaseId: notionDatabaseId || "",
      perplexityApiKey: perplexityApiKey || "",
      timestamp: new Date().toISOString(),
    };

    // Chemin vers le fichier de configuration temporaire
    const tempSettingsPath = path.join(__dirname, "../../data/temp-settings.json");

    // Créer le dossier data s'il n'existe pas
    const dataDir = path.join(__dirname, "../../data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Écrire les paramètres dans le fichier
    fs.writeFileSync(tempSettingsPath, JSON.stringify(sessionSettings, null, 2));

    // Mettre à jour la configuration en mémoire
    if (notionToken) config.notion.secret = notionToken;
    if (notionDatabaseId) config.notion.databaseId = notionDatabaseId;
    if (perplexityApiKey) config.ai.perplexityApiKey = perplexityApiKey;

    // Mettre à jour les flags enabled
    config.notion.enabled = !!(config.notion.secret && config.notion.databaseId);
    config.ai.perplexityEnabled = !!config.ai.perplexityApiKey;

    logger.info("Paramètres utilisateur mis à jour");

    res.json({
      success: true,
      message: "Paramètres enregistrés avec succès",
      settings: {
        notionEnabled: config.notion.enabled,
        perplexityEnabled: config.ai.perplexityEnabled,
      },
    });
  } catch (error) {
    logger.error("Erreur lors de l'enregistrement des paramètres:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'enregistrement des paramètres",
    });
  }
});

export default router; 