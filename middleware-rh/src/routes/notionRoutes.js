/**
 * Routes pour l'intégration avec Notion
 */

import express from "express";
import notionController from "../controllers/notionController.js";

const router = express.Router();

// Route pour synchroniser les candidatures avec Notion
router.post("/sync", notionController.syncCandidaturesToNotion);

// Route pour récupérer les candidatures depuis Notion
router.get("/candidatures", notionController.fetchCandidaturesFromNotion);

export default router;
