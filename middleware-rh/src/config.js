/**
 * Configuration centralisée de l'application
 * Ce fichier gère toutes les variables de configuration de l'application
 * en utilisant les variables d'environnement définies dans le fichier .env
 */

import dotenv from "dotenv";
dotenv.config();

/**
 * Configuration globale de l'application
 * @typedef {Object} Config
 * @property {Object} server - Configuration du serveur
 * @property {Object} database - Configuration de la base de données
 * @property {Object} notion - Configuration de l'API Notion
 * @property {Object} ai - Configuration des services d'IA
 * @property {Object} logging - Configuration des logs
 * @property {Object} ssl - Configuration SSL pour HTTPS
 * @property {Object} firebase - Configuration de Firebase
 * @property {Object} jwt - Configuration de JWT
 * @property {Object} session - Configuration de la session
 */
const config = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || "development",
    // URL de base de l'application (sans slash final)
    baseUrl: process.env.BASE_URL || "http://localhost:3000",
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  notion: {
    // Token d'API Notion (optionnel)
    secret: process.env.NOTION_TOKEN || "",
    // ID de la base de données Notion (optionnel)
    databaseId: process.env.NOTION_DATABASE_ID || "",
    // Indique si l'intégration Notion est activée
    enabled: !!(process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID),
  },
  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    // Clé API Perplexity (optionnelle)
    perplexityApiKey: process.env.PERPLEXITY_API_KEY || "",
    perplexityEnabled: !!process.env.PERPLEXITY_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.AI_MODEL || "gpt-3.5-turbo",
  },
  logging: {
    // Niveau de log (debug, info, warn, error)
    level: process.env.LOG_LEVEL || "info",
    // Désactive les logs verbeux en production
    disableVerboseLogging: process.env.DISABLE_VERBOSE_LOGGING === "true",
  },
  ssl: {
    // Chemin vers la clé privée SSL (pour HTTPS)
    keyPath: process.env.SSL_KEY_PATH || "",
    // Chemin vers le certificat SSL (pour HTTPS)
    certPath: process.env.SSL_CERT_PATH || "",
    // Indique si HTTPS est activé
    enabled: !!(process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH),
  },
  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "",
    databaseURL: process.env.FIREBASE_DATABASE_URL || "",
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: process.env.FIREBASE_PRIVATE_KEY || "",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "autoapply-secret-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  session: {
    secret: process.env.SESSION_SECRET || "autoapply-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    },
  },
};

export default config;
