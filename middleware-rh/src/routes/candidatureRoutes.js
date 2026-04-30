/**
 * Routes pour les candidatures
 * Ce fichier gère les routes liées aux candidatures
 */

import express from "express";
import { checkAuth } from "../middleware/authMiddleware.js";
import logger from "../utils/loggerUtils.js";
import firebaseCandidatureService from "../services/firebaseCandidatureService.js";
import salaryUtils from "../utils/salaryUtils.js";

const router = express.Router();

/**
 * @route GET /api/candidatures/stats
 * @description Calcule les statistiques des candidatures (count, statuts, salaire moyen)
 * @access Private
 */
router.get("/stats", checkAuth, async (req, res) => {
  try {
    const candidatures = await firebaseCandidatureService.getUserCandidatures(req.user.uid);

    // Count par statut
    const statusCount = {};
    candidatures.forEach((c) => {
      const s = c.statut || "Postulé";
      statusCount[s] = (statusCount[s] || 0) + 1;
    });

    // Count par source (site d'emploi)
    const sourceCount = {};
    candidatures.forEach((c) => {
      const src = c.source || "Autre";
      sourceCount[src] = (sourceCount[src] || 0) + 1;
    });

    // Calcul salaire moyen mensuel (uniquement ceux avec un salaire défini)
    const withSalary = candidatures.filter((c) => {
      const s = c.salaire || c.salary;
      if (!s || s === "Non défini") return false;
      return salaryUtils.extractSalaryValue(s) > 0;
    });

    let averageMonthlySalary = null;
    if (withSalary.length > 0) {
      const total = withSalary.reduce((sum, c) => {
        const s = c.salaire || c.salary;
        return sum + salaryUtils.calculateMonthlySalary(s);
      }, 0);
      averageMonthlySalary = Math.round(total / withSalary.length);
    }

    res.json({
      success: true,
      total: candidatures.length,
      withSalaryCount: withSalary.length,
      averageMonthlySalary,
      statusCount,
      sourceCount,
    });
  } catch (error) {
    logger.error("Erreur lors du calcul des statistiques:", error);
    res.status(500).json({ success: false, error: "Erreur lors du calcul des statistiques" });
  }
});

/**
 * @route GET /api/candidatures
 * @description Récupère toutes les candidatures de l'utilisateur connecté
 * @access Private
 */
router.get("/", checkAuth, async (req, res) => {
  try {
    // Ajouter un log pour déboguer
    logger.info(
      `Récupération des candidatures pour l'utilisateur: ${req.user.uid}`
    );

    // Récupérer toutes les candidatures de l'utilisateur
    // Cette fonction filtre déjà par userId
    const candidatures = await firebaseCandidatureService.getUserCandidatures(
      req.user.uid
    );

    logger.info(
      `${candidatures.length} candidatures trouvées pour l'utilisateur: ${req.user.uid}`
    );

    // Normaliser les candidatures
    const normalizedCandidatures = candidatures.map((candidature) => {
      // Normaliser le statut
      let status = candidature.statut;

      // Normaliser le salaire
      let salary = candidature.salaire;
      if (!salary || salary === "" || salary === 0) {
        salary = "Non défini";
      }

      // Convertir les Firestore Timestamps en ISO strings pour les nouveaux champs date
      const toISO = (val) => val?.toDate?.()?.toISOString() ?? (val?._seconds ? new Date(val._seconds * 1000).toISOString() : val || null);

      return {
        ...candidature,
        status,
        statut: status,
        salary,
        salaire: salary,
        date: toISO(candidature.createdAt),
        follow_up_date: toISO(candidature.follow_up_date),
        response_date: toISO(candidature.response_date),
        interview_date: toISO(candidature.interview_date),
      };
    });

    res.json(normalizedCandidatures);
  } catch (error) {
    logger.error("Erreur lors de la récupération des candidatures:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des candidatures",
    });
  }
});

/**
 * @route POST /api/candidatures
 * @description Crée une nouvelle candidature
 * @access Private
 */
router.post("/", checkAuth, async (req, res) => {
  try {
    const {
      entreprise,
      poste,
      statut,
      salaire,
      salary,        // champ envoyé par l'extension
      date,
      location,
      description,
      hrDetails,     // champ envoyé par l'extension
      notes,
      applicationLink, // champ envoyé par l'extension
      link,
      source,        // champ envoyé par l'extension (LinkedIn / Indeed)
      cv_type,       // IT_SUPPORT | COORDINATION | DATA_ANALYSIS
      cv_version,    // FR | EN
      contact_method, // LINKEDIN_EASY_APPLY | MAIL_DIRECT | SITE_CARRIÈRE
      priority,      // HIGH | MEDIUM | LOW
      follow_up_date,
      interview_date,
      response_type, // EMAIL | PHONE | LINKEDIN | NONE
    } = req.body;

    if (!entreprise || !poste) {
      return res.status(400).json({
        success: false,
        error: "Entreprise et poste sont requis",
      });
    }

    // Normaliser le statut (accepte anglais ou français)
    const rawStatut = statut || "Postulé";
    let normalizedStatus = rawStatut;
    const statutLower = rawStatut.toLowerCase();
    if (statutLower === "applied") normalizedStatus = "Postulé";
    if (statutLower === "interviewed") normalizedStatus = "Interviewé";
    if (statutLower === "job rejected") normalizedStatus = "Job refusé";
    if (statutLower === "job accepted") normalizedStatus = "Job accepté";

    // Créer la candidature — on filtre les undefined (Firestore les refuse)
    const raw = {
      entreprise,
      poste,
      statut: normalizedStatus,
      salaire: salaire || salary || "Non défini",
      location,
      description: description || hrDetails,
      link: link || applicationLink,
      source,
      notes,
      cv_type,
      cv_version,
      contact_method,
      priority: priority || "MEDIUM",
      follow_up_date: follow_up_date ? new Date(follow_up_date) : undefined,
      follow_up_count: 0,
      response_date: undefined,
      response_type,
      interview_date: interview_date ? new Date(interview_date) : undefined,
    };
    const candidatureData = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== undefined)
    );

    const candidature = await firebaseCandidatureService.createCandidature(
      candidatureData,
      req.user.uid
    );

    // Ajouter un champ date pour la compatibilité avec le frontend
    const candidatureWithDate = {
      ...candidature,
      date: candidature.createdAt?.toDate?.()?.toISOString() ?? (candidature.createdAt?._seconds ? new Date(candidature.createdAt._seconds * 1000).toISOString() : candidature.createdAt),
    };

    res.status(201).json({
      success: true,
      message: "Candidature créée avec succès",
      candidature: candidatureWithDate,
    });
  } catch (error) {
    logger.error("Erreur lors de la création de la candidature:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la création de la candidature",
    });
  }
});

/**
 * @route PUT /api/candidatures/:id
 * @description Met à jour une candidature
 * @access Private
 */
router.put("/:id", checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      entreprise,
      poste,
      statut,
      salaire,
      date,
      location,
      description,
      notes,
      cv_type,
      cv_version,
      contact_method,
      priority,
      follow_up_date,
      follow_up_count,
      response_date,
      response_type,
      interview_date,
    } = req.body;

    // Normaliser le statut
    let normalizedStatus = statut;
    if (statut && statut.toLowerCase() === "applied")
      normalizedStatus = "Postulé";
    if (statut && statut.toLowerCase() === "interviewed")
      normalizedStatus = "Interviewé";
    if (statut && statut.toLowerCase() === "job rejected")
      normalizedStatus = "Job refusé";
    if (statut && statut.toLowerCase() === "job accepted")
      normalizedStatus = "Job accepté";

    // Préparer les données de mise à jour
    const updateData = {};

    if (entreprise) updateData.entreprise = entreprise;
    if (poste) updateData.poste = poste;
    if (statut) updateData.statut = normalizedStatus;
    if (salaire) updateData.salaire = salaire;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (notes !== undefined) updateData.notes = notes;
    if (cv_type !== undefined) updateData.cv_type = cv_type;
    if (cv_version !== undefined) updateData.cv_version = cv_version;
    if (contact_method !== undefined) updateData.contact_method = contact_method;
    if (priority !== undefined) updateData.priority = priority;
    if (follow_up_date !== undefined) updateData.follow_up_date = follow_up_date ? new Date(follow_up_date) : null;
    if (follow_up_count !== undefined) updateData.follow_up_count = follow_up_count;
    if (response_date !== undefined) updateData.response_date = response_date ? new Date(response_date) : null;
    if (response_type !== undefined) updateData.response_type = response_type;
    if (interview_date !== undefined) updateData.interview_date = interview_date ? new Date(interview_date) : null;

    // Mettre à jour la candidature
    const updatedCandidature =
      await firebaseCandidatureService.updateCandidature(
        id,
        updateData,
        req.user.uid
      );

    // Ajouter un champ date pour la compatibilité avec le frontend
    const updatedCandidatureWithDate = {
      ...updatedCandidature,
      date: updatedCandidature.updatedAt,
    };

    res.json({
      success: true,
      message: "Candidature mise à jour avec succès",
      candidature: updatedCandidatureWithDate,
    });
  } catch (error) {
    logger.error("Erreur lors de la mise à jour de la candidature:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la mise à jour de la candidature",
    });
  }
});

/**
 * @route DELETE /api/candidatures/:id
 * @description Supprime une candidature
 * @access Private
 */
router.delete("/:id", checkAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Supprimer la candidature
    await firebaseCandidatureService.deleteCandidature(id, req.user.uid);

    res.json({
      success: true,
      message: "Candidature supprimée avec succès",
    });
  } catch (error) {
    logger.error("Erreur lors de la suppression de la candidature:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la suppression de la candidature",
    });
  }
});

/**
 * @route DELETE /api/candidatures/all
 * @description Supprime toutes les candidatures de l'utilisateur
 * @access Private
 */
router.delete("/all", checkAuth, async (req, res) => {
  try {
    // Supprimer toutes les candidatures de l'utilisateur
    const count = await firebaseCandidatureService.deleteAllUserCandidatures(
      req.user.uid
    );

    logger.info(
      `${count} candidatures supprimées pour l'utilisateur: ${req.user.uid}`
    );

    res.json({
      success: true,
      message: `${count} candidatures ont été supprimées avec succès`,
      count: count,
    });
  } catch (error) {
    logger.error("Erreur lors de la suppression des candidatures:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la suppression des candidatures",
    });
  }
});

/**
 * @route POST /api/candidatures/follow-up/:id
 * @description Planifie une relance pour une candidature
 * @access Private
 */
router.post("/follow-up/:id", checkAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer la candidature existante
    const candidatures = await firebaseCandidatureService.getUserCandidatures(req.user.uid);
    const existing = candidatures.find((c) => c.id === id);

    if (!existing) {
      return res.status(404).json({ success: false, error: "Candidature non trouvée" });
    }

    const currentCount = existing.follow_up_count || 0;
    const followUpCount = currentCount + 1;

    // Délais : 3j après candidature, 7j après 1ère relance, 14j après 2ème+
    const delays = { 1: 3, 2: 7, 3: 14 };
    const delayDays = delays[followUpCount] || 14;
    const followUpDate = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);

    await firebaseCandidatureService.updateCandidature(
      id,
      { follow_up_count: followUpCount, follow_up_date: followUpDate },
      req.user.uid
    );

    res.json({
      success: true,
      follow_up_date: followUpDate.toISOString(),
      follow_up_count: followUpCount,
      message: `${followUpCount}${followUpCount === 1 ? "ère" : "ème"} relance planifiée le ${followUpDate.toLocaleDateString("fr-FR")}`,
    });
  } catch (error) {
    logger.error("Erreur lors de la planification de relance:", error);
    res.status(500).json({ success: false, error: "Erreur lors de la planification de relance" });
  }
});

/**
 * @route POST /api/candidatures/import
 * @description Importe les candidatures depuis le fichier JSON
 * @access Private
 */
router.post("/import", checkAuth, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est administrateur
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Vous n'êtes pas autorisé à effectuer cette action",
      });
    }

    const count = await firebaseCandidatureService.importCandidaturesFromJson();

    res.json({
      success: true,
      message: `${count} candidatures ont été importées avec succès`,
      count: count,
    });
  } catch (error) {
    logger.error("Erreur lors de l'import des candidatures:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'import des candidatures",
    });
  }
});

/**
 * @route POST /api/candidatures/demo
 * @description Crée des candidatures de démonstration pour l'utilisateur
 * @access Private
 */
router.post("/demo", checkAuth, async (req, res) => {
  try {
    // Vérifier si l'utilisateur a déjà des candidatures
    const existingCandidatures =
      await firebaseCandidatureService.getUserCandidatures(req.user.uid);

    if (existingCandidatures.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Vous avez déjà des candidatures",
        count: existingCandidatures.length,
      });
    }

    // Créer des candidatures de démonstration
    const count = await firebaseCandidatureService.createDemoCandidatures(
      req.user.uid
    );

    res.json({
      success: true,
      message: `${count} candidatures de démonstration ont été créées`,
      count,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la création des candidatures de démonstration:",
      error
    );
    res.status(500).json({
      success: false,
      error: "Erreur lors de la création des candidatures de démonstration",
    });
  }
});

export default router;
