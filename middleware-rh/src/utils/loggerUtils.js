/**
 * Utilitaires pour la gestion des logs
 */

import config from "../config.js";

// Niveaux de log
const LOG_LEVELS = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
};

// Configuration du niveau de log
const currentLogLevel = config.logging.level.toUpperCase() || LOG_LEVELS.INFO;

// Mapping des niveaux de log pour déterminer quels logs afficher
const LOG_LEVEL_PRIORITY = {
  [LOG_LEVELS.ERROR]: 0,
  [LOG_LEVELS.WARN]: 1,
  [LOG_LEVELS.INFO]: 2,
  [LOG_LEVELS.DEBUG]: 3,
};

// Garde-fou pour éviter les logs trop fréquents
const logThrottling = {
  lastLogTime: {},
  minInterval: 1000, // Intervalle minimum entre les logs similaires (en ms)
};

/**
 * Vérifie si un niveau de log doit être affiché
 * @param {string} level - Niveau de log à vérifier
 * @returns {boolean} - True si le log doit être affiché
 */
function shouldLog(level) {
  return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[currentLogLevel];
}

/**
 * Vérifie si un message similaire a été loggé récemment
 * @param {string} key - Clé unique pour le message
 * @returns {boolean} - True si le message peut être loggé
 */
function shouldThrottleLog(key) {
  const now = Date.now();
  const lastTime = logThrottling.lastLogTime[key] || 0;

  if (now - lastTime < logThrottling.minInterval) {
    return true; // Throttle ce log
  }

  // Mettre à jour le temps du dernier log
  logThrottling.lastLogTime[key] = now;
  return false;
}

/**
 * Formate un message de log
 * @param {string} level - Niveau de log
 * @param {string} message - Message à logger
 * @param {Object} data - Données additionnelles
 * @returns {string} - Message formaté
 */
function formatLogMessage(level, message, data) {
  const timestamp = new Date().toISOString();
  let formattedMessage = `[${timestamp}] [${level}] ${message}`;

  if (data) {
    try {
      const dataString =
        typeof data === "object"
          ? JSON.stringify(data, null, 2)
          : data.toString();
      formattedMessage += `\n${dataString}`;
    } catch (error) {
      formattedMessage += "\n[Error formatting data]";
    }
  }

  return formattedMessage;
}

/**
 * Logger pour les erreurs
 * @param {string} message - Message d'erreur
 * @param {Error|Object} error - Objet d'erreur ou données additionnelles
 */
function error(message, error) {
  if (!shouldLog(LOG_LEVELS.ERROR)) return;

  const errorData =
    error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;

  console.error(formatLogMessage(LOG_LEVELS.ERROR, message, errorData));
}

/**
 * Logger pour les avertissements
 * @param {string} message - Message d'avertissement
 * @param {Object} data - Données additionnelles
 */
function warn(message, data) {
  if (!shouldLog(LOG_LEVELS.WARN)) return;
  console.warn(formatLogMessage(LOG_LEVELS.WARN, message, data));
}

/**
 * Logger pour les informations
 * @param {string} message - Message d'information
 * @param {Object} data - Données additionnelles
 * @param {boolean} throttle - Si true, limite la fréquence des logs similaires
 */
function info(message, data, throttle = false) {
  if (!shouldLog(LOG_LEVELS.INFO)) return;

  // Si le throttling est activé, vérifier si le message doit être loggé
  if (throttle) {
    const key = `INFO:${message}`;
    if (shouldThrottleLog(key)) return;
  }

  console.log(formatLogMessage(LOG_LEVELS.INFO, message, data));
}

/**
 * Logger pour le débogage
 * @param {string} message - Message de débogage
 * @param {Object} data - Données additionnelles
 * @param {boolean} throttle - Si true, limite la fréquence des logs similaires
 */
function debug(message, data, throttle = false) {
  if (!shouldLog(LOG_LEVELS.DEBUG)) return;

  // Si le throttling est activé, vérifier si le message doit être loggé
  if (throttle || config.logging.disableVerboseLogging) {
    const key = `DEBUG:${message}`;
    if (shouldThrottleLog(key)) return;
  }

  console.log(formatLogMessage(LOG_LEVELS.DEBUG, message, data));
}

export default {
  LOG_LEVELS,
  error,
  warn,
  info,
  debug,
};
