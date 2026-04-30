/**
 * Contrôleur pour l'intégration avec Notion
 */

import notionService from "../services/notionService.js";
import firebaseCandidatureService from "../services/firebaseCandidatureService.js";
import logger from "../utils/loggerUtils.js";

/**
 * Synchronise les candidatures avec Notion
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
async function syncCandidaturesToNotion(req, res) {
  try {
    const candidatures = await firebaseCandidatureService.getUserCandidatures(req.user.uid);

    logger.info("Début de la synchronisation avec Notion", {
      candidatureCount: candidatures.length,
    });

    const result = await notionService.syncCandidaturesToNotion(candidatures);

    res.json({
      success: true,
      message: "Synchronisation avec Notion réussie",
      ...result,
    });
  } catch (error) {
    logger.error("Erreur lors de la synchronisation avec Notion", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la synchronisation avec Notion",
    });
  }
}

/**
 * Récupère les candidatures depuis Notion
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
async function fetchCandidaturesFromNotion(req, res) {
  try {
    const candidatures =
      await notionService.fetchExistingCandidaturesFromNotion();

    res.json({
      success: true,
      candidatures,
      count: candidatures.length,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des candidatures depuis Notion",
      error
    );
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des candidatures depuis Notion",
    });
  }
}

export default {
  syncCandidaturesToNotion,
  fetchCandidaturesFromNotion,
};
