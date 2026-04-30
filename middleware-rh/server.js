/**
 * Point d'entrée de l'application
 * Ce fichier configure et démarre le serveur HTTP/HTTPS
 */

import app from "./src/app.js";
import config from "./src/config.js";
import logger from "./src/utils/loggerUtils.js";
import http from "http";
import https from "https";
import fs from "fs";

// Port d'écoute
const PORT = config.server.port;

// Création du serveur (HTTP ou HTTPS selon la configuration)
let server;

if (config.ssl.enabled) {
  try {
    // Configuration HTTPS avec les certificats SSL
    const httpsOptions = {
      key: fs.readFileSync(config.ssl.keyPath),
      cert: fs.readFileSync(config.ssl.certPath),
    };

    // Création du serveur HTTPS
    server = https.createServer(httpsOptions, app);

    logger.info(`✅ Serveur HTTPS lancé sur ${config.server.baseUrl}`, {
      port: PORT,
      env: config.server.env,
      ssl: true,
    });
  } catch (error) {
    logger.error(
      `❌ Erreur lors du démarrage du serveur HTTPS: ${error.message}`,
      {
        error: error.stack,
      }
    );

    // Fallback vers HTTP en cas d'erreur avec les certificats SSL
    logger.warn(
      "⚠️ Fallback vers HTTP suite à une erreur avec les certificats SSL"
    );
    server = http.createServer(app);
  }
} else {
  // Création d'un serveur HTTP standard
  server = http.createServer(app);

  logger.info(`✅ Serveur HTTP lancé sur ${config.server.baseUrl}`, {
    port: PORT,
    env: config.server.env,
    ssl: false,
  });
}

// Démarrage du serveur
server.listen(PORT, () => {
  logger.info(`🚀 Application démarrée en mode ${config.server.env}`, {
    baseUrl: config.server.baseUrl,
    port: PORT,
  });
});
