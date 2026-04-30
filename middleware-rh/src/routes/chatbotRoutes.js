/**
 * Routes pour la gestion du chatbot
 */

import express from "express";
import chatbotController from "../controllers/chatbotController.js";

const router = express.Router();

// Route pour générer une réponse du chatbot
router.post("/ask", chatbotController.generateResponse);

// Route pour récupérer les statistiques d'utilisation
router.get("/stats", chatbotController.getUsageStats);

// Route pour ajouter des offres d'exemple
router.post("/sample-offers", chatbotController.addSampleOffers);

export default router;
