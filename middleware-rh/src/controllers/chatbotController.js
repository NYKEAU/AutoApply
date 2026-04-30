/**
 * Contrôleur pour la gestion du chatbot
 */

import chatbotService from "../services/chatbotService.js";
import dataService from "../services/dataService.js";
import logger from "../utils/loggerUtils.js";

/**
 * Génère une réponse pour le chatbot
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
async function generateResponse(req, res) {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Le message est requis",
      });
    }

    logger.info("Requête chatbot reçue", { message });

    const response = await chatbotService.generateChatbotResponse(message);

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la génération de la réponse du chatbot",
      error
    );
    res.status(500).json({
      success: false,
      error: "Erreur lors de la génération de la réponse",
    });
  }
}

/**
 * Récupère les statistiques d'utilisation de l'IA
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
function getUsageStats(req, res) {
  try {
    const stats = chatbotService.getUsageStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des statistiques d'utilisation",
      error
    );
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des statistiques d'utilisation",
    });
  }
}

/**
 * Ajoute des offres d'exemple
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
function addSampleOffers(req, res) {
  try {
    // Offres d'exemple
    const sampleOffers = [
      {
        titre: "Développeur Full Stack",
        description:
          "Nous recherchons un développeur Full Stack expérimenté pour rejoindre notre équipe. Vous travaillerez sur des projets web innovants utilisant les dernières technologies.",
        technologies: ["JavaScript", "React", "Node.js", "MongoDB", "AWS"],
        localisation: "Montréal, QC",
      },
      {
        titre: "UX/UI Designer",
        description:
          "Rejoignez notre équipe de design pour créer des expériences utilisateur exceptionnelles. Vous collaborerez avec les équipes produit et développement.",
        technologies: [
          "Figma",
          "Adobe XD",
          "Sketch",
          "HTML/CSS",
          "Prototypage",
        ],
        localisation: "Québec, QC",
      },
      {
        titre: "Data Scientist",
        description:
          "Nous cherchons un Data Scientist pour analyser nos données et développer des modèles prédictifs. Vous travaillerez sur des projets d'IA et de machine learning.",
        technologies: ["Python", "TensorFlow", "PyTorch", "SQL", "Big Data"],
        localisation: "Montréal, QC",
      },
    ];

    // Ajouter les offres
    for (const offer of sampleOffers) {
      dataService.addOffre(offer);
    }

    res.json({
      success: true,
      message: "Offres d'exemple ajoutées avec succès",
    });
  } catch (error) {
    logger.error("Erreur lors de l'ajout des offres d'exemple", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'ajout des offres d'exemple",
    });
  }
}

export default {
  generateResponse,
  getUsageStats,
  addSampleOffers,
};
