/**
 * Service pour la gestion du chatbot et des interactions IA
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import config from "../config.js";
import logger from "../utils/loggerUtils.js";

// Recréer __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers le fichier de statistiques d'utilisation
const USAGE_STATS_FILE = path.join(__dirname, "../../data/usage-stats.json");

/**
 * Charge les statistiques d'utilisation de l'IA
 * @returns {Object} - Statistiques d'utilisation
 */
function loadUsageStats() {
  try {
    if (fs.existsSync(USAGE_STATS_FILE)) {
      const statsData = fs.readFileSync(USAGE_STATS_FILE, "utf8");
      return JSON.parse(statsData);
    } else {
      // Initialiser les statistiques si le fichier n'existe pas
      const initialStats = {
        tokensUsed: 0,
        inputTokens: 0,
        outputTokens: 0,
        requestCount: 0,
        estimatedCost: 0,
      };
      saveUsageStats(initialStats);
      return initialStats;
    }
  } catch (error) {
    logger.error(
      "Erreur lors du chargement des statistiques d'utilisation",
      error
    );
    return {
      tokensUsed: 0,
      inputTokens: 0,
      outputTokens: 0,
      requestCount: 0,
      estimatedCost: 0,
    };
  }
}

/**
 * Sauvegarde les statistiques d'utilisation de l'IA
 * @param {Object} stats - Statistiques d'utilisation
 */
function saveUsageStats(stats) {
  try {
    const statsDir = path.dirname(USAGE_STATS_FILE);
    if (!fs.existsSync(statsDir)) {
      fs.mkdirSync(statsDir, { recursive: true });
    }
    fs.writeFileSync(USAGE_STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    logger.error(
      "Erreur lors de la sauvegarde des statistiques d'utilisation",
      error
    );
  }
}

/**
 * Met à jour les statistiques d'utilisation de l'IA
 * @param {number} inputTokens - Nombre de tokens d'entrée
 * @param {number} outputTokens - Nombre de tokens de sortie
 */
function updateUsageStats(inputTokens, outputTokens) {
  try {
    const stats = loadUsageStats();

    // Mettre à jour les compteurs
    stats.inputTokens = (stats.inputTokens || 0) + inputTokens;
    stats.outputTokens = (stats.outputTokens || 0) + outputTokens;
    stats.tokensUsed = stats.inputTokens + stats.outputTokens;
    stats.requestCount = (stats.requestCount || 0) + 1;

    // Calculer le coût estimé
    const estimatedCostInput =
      (stats.inputTokens / 1_000_000) * config.ai.costPerMillionInputTokens;
    const estimatedCostOutput =
      (stats.outputTokens / 1_000_000) * config.ai.costPerMillionOutputTokens;
    const estimatedCostRequests =
      (stats.requestCount / 1000) * config.ai.costPerThousandRequests;

    stats.estimatedCost =
      estimatedCostInput + estimatedCostOutput + estimatedCostRequests;

    saveUsageStats(stats);
    return stats;
  } catch (error) {
    logger.error(
      "Erreur lors de la mise à jour des statistiques d'utilisation",
      error
    );
    return null;
  }
}

/**
 * Envoie une requête à l'API Perplexity
 * @param {string} prompt - Prompt à envoyer
 * @returns {Promise<string>} - Réponse de l'API
 */
async function askPerplexity(prompt) {
  try {
    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: "llama-3-sonar-small-32k-online",
        messages: [
          {
            role: "system",
            content:
              "Tu es un assistant RH spécialisé dans l'aide à la recherche d'emploi.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1024,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Estimer le nombre de tokens
    const inputTokens = prompt.length / 4; // Estimation grossière
    const outputTokens = response.data.choices[0].message.content.length / 4; // Estimation grossière

    // Mettre à jour les statistiques
    updateUsageStats(inputTokens, outputTokens);

    return response.data.choices[0].message.content;
  } catch (error) {
    logger.error("Erreur lors de la requête à l'API Perplexity", error);
    throw error;
  }
}

/**
 * Génère une réponse pour le chatbot
 * @param {string} message - Message de l'utilisateur
 * @returns {Promise<string>} - Réponse du chatbot
 */
async function generateChatbotResponse(message) {
  try {
    const prompt = `En tant qu'assistant RH, aide-moi avec cette question: ${message}`;
    return await askPerplexity(prompt);
  } catch (error) {
    logger.error(
      "Erreur lors de la génération de la réponse du chatbot",
      error
    );
    return "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer plus tard.";
  }
}

/**
 * Récupère les statistiques d'utilisation de l'IA
 * @returns {Object} - Statistiques d'utilisation
 */
function getUsageStats() {
  try {
    const stats = loadUsageStats();

    // S'assurer que toutes les propriétés nécessaires existent
    return {
      inputTokens: stats.inputTokens || 0,
      outputTokens: stats.outputTokens || 0,
      requests: stats.requestCount || 0,
      estimatedCost: stats.estimatedCost || 0,
      lastUpdated: stats.lastUpdated || new Date().toISOString(),
    };
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des statistiques d'utilisation",
      error
    );
    // Retourner un objet par défaut en cas d'erreur
    return {
      inputTokens: 0,
      outputTokens: 0,
      requests: 0,
      estimatedCost: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export default {
  generateChatbotResponse,
  getUsageStats,
  askPerplexity,
};
