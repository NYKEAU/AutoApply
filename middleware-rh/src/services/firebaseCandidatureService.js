/**
 * Service pour la gestion des candidatures avec Firebase
 */

import { db, admin } from "../lib/firebase.js";
import logger from "../utils/loggerUtils.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Collection Firestore pour les candidatures
const CANDIDATURES_COLLECTION = "candidatures";

// Chemin vers le fichier de données JSON
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, "../../data/candidatures.json");

/**
 * Récupère toutes les candidatures d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} - Liste des candidatures
 */
async function getUserCandidatures(userId) {
  try {
    const snapshot = await db
      .collection(CANDIDATURES_COLLECTION)
      .where("userId", "==", userId)
      .get();

    const candidatures = [];
    snapshot.forEach((doc) => {
      candidatures.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Tri par date décroissante en mémoire (évite l'index composite Firestore)
    candidatures.sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() ?? new Date(a.createdAt ?? 0).getTime();
      const dateB = b.createdAt?.toMillis?.() ?? new Date(b.createdAt ?? 0).getTime();
      return dateB - dateA;
    });

    logger.info(
      `${candidatures.length} candidatures récupérées pour l'utilisateur: ${userId}`
    );
    return candidatures;
  } catch (error) {
    logger.error("Erreur lors de la récupération des candidatures:", error);
    throw error;
  }
}

/**
 * Récupère les candidatures orphelines (sans utilisateur associé)
 * @returns {Promise<Array>} - Liste des candidatures orphelines
 */
async function getOrphanCandidatures() {
  try {
    const snapshot = await db
      .collection(CANDIDATURES_COLLECTION)
      .where("userId", "==", null)
      .get();

    const candidatures = [];
    snapshot.forEach((doc) => {
      candidatures.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    logger.info(`${candidatures.length} candidatures orphelines trouvées`);
    return candidatures;
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des candidatures orphelines:",
      error
    );
    throw error;
  }
}

/**
 * Crée une nouvelle candidature
 * @param {Object} candidatureData - Données de la candidature
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} - La candidature créée
 */
async function createCandidature(candidatureData, userId) {
  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const data = {
      ...candidatureData,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection(CANDIDATURES_COLLECTION).add(data);
    const doc = await docRef.get();

    logger.info(`Candidature créée avec succès: ${docRef.id}`);

    return {
      id: docRef.id,
      ...doc.data(),
    };
  } catch (error) {
    logger.error("Erreur lors de la création de la candidature:", error);
    throw error;
  }
}

/**
 * Met à jour une candidature existante
 * @param {string} id - ID de la candidature
 * @param {Object} candidatureData - Nouvelles données
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} - La candidature mise à jour
 */
async function updateCandidature(id, candidatureData, userId) {
  try {
    // Vérifier si la candidature existe et appartient à l'utilisateur
    const doc = await db.collection(CANDIDATURES_COLLECTION).doc(id).get();

    if (!doc.exists) {
      throw new Error("Candidature non trouvée");
    }

    const candidature = doc.data();
    if (candidature.userId !== userId) {
      throw new Error("Vous n'êtes pas autorisé à modifier cette candidature");
    }

    // Mettre à jour la candidature
    const now = admin.firestore.FieldValue.serverTimestamp();
    const updateData = {
      ...candidatureData,
      updatedAt: now,
    };

    await db.collection(CANDIDATURES_COLLECTION).doc(id).update(updateData);
    const updatedDoc = await db
      .collection(CANDIDATURES_COLLECTION)
      .doc(id)
      .get();

    logger.info(`Candidature mise à jour avec succès: ${id}`);

    return {
      id,
      ...updatedDoc.data(),
    };
  } catch (error) {
    logger.error("Erreur lors de la mise à jour de la candidature:", error);
    throw error;
  }
}

/**
 * Supprime une candidature
 * @param {string} id - ID de la candidature
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<boolean>} - true si supprimée avec succès
 */
async function deleteCandidature(id, userId) {
  try {
    // Vérifier si la candidature existe et appartient à l'utilisateur
    const doc = await db.collection(CANDIDATURES_COLLECTION).doc(id).get();

    if (!doc.exists) {
      throw new Error("Candidature non trouvée");
    }

    const candidature = doc.data();
    if (candidature.userId !== userId) {
      throw new Error("Vous n'êtes pas autorisé à supprimer cette candidature");
    }

    // Supprimer la candidature
    await db.collection(CANDIDATURES_COLLECTION).doc(id).delete();

    logger.info(`Candidature supprimée avec succès: ${id}`);
    return true;
  } catch (error) {
    logger.error("Erreur lors de la suppression de la candidature:", error);
    throw error;
  }
}

/**
 * Supprime toutes les candidatures d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<number>} - Nombre de candidatures supprimées
 */
async function deleteAllUserCandidatures(userId) {
  try {
    const candidatures = await getUserCandidatures(userId);

    // Supprimer toutes les candidatures en parallèle
    const deletePromises = candidatures.map((candidature) =>
      db.collection(CANDIDATURES_COLLECTION).doc(candidature.id).delete()
    );

    await Promise.all(deletePromises);

    logger.info(
      `${candidatures.length} candidatures supprimées pour l'utilisateur: ${userId}`
    );
    return candidatures.length;
  } catch (error) {
    logger.error("Erreur lors de la suppression des candidatures:", error);
    throw error;
  }
}

/**
 * Importe les candidatures depuis le fichier JSON
 * @returns {Promise<number>} - Nombre de candidatures importées
 */
async function importCandidaturesFromJson() {
  try {
    // Vérifier si le fichier existe
    if (!fs.existsSync(dataPath)) {
      logger.warn("Fichier de données non trouvé:", dataPath);
      return 0;
    }

    // Lire le fichier JSON
    const rawData = fs.readFileSync(dataPath, "utf8");
    const candidatures = JSON.parse(rawData);

    // Vérifier si des candidatures existent déjà dans Firestore
    const snapshot = await db
      .collection(CANDIDATURES_COLLECTION)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      logger.info(
        "Des candidatures existent déjà dans Firestore, import ignoré"
      );
      return 0;
    }

    // Importer les candidatures
    const batch = db.batch();
    candidatures.forEach((candidature) => {
      const docRef = db.collection(CANDIDATURES_COLLECTION).doc();
      // Convertir les dates en objets Timestamp
      const createdAt = candidature.createdAt
        ? new Date(candidature.createdAt)
        : new Date();
      const updatedAt = candidature.updatedAt
        ? new Date(candidature.updatedAt)
        : new Date();

      // Extraire l'id pour ne pas l'inclure dans les données
      const { id, ...candidatureData } = candidature;

      batch.set(docRef, {
        ...candidatureData,
        createdAt: admin.firestore.Timestamp.fromDate(createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(updatedAt),
        userId: null,
      });
    });

    await batch.commit();

    logger.info(
      `${candidatures.length} candidatures importées depuis le fichier JSON`
    );
    return candidatures.length;
  } catch (error) {
    logger.error("Erreur lors de l'import des candidatures:", error);
    throw error;
  }
}

/**
 * Crée des candidatures de démonstration pour un nouvel utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<number>} - Nombre de candidatures créées
 */
async function createDemoCandidatures(userId) {
  try {
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Exemples de candidatures de démonstration
    const demoCandidatures = [
      {
        entreprise: "Entreprise ABC",
        poste: "Développeur Full Stack",
        statut: "Postulé",
        salaire: "50000€ - 60000€",
        location: "Paris",
        description:
          "Poste de développeur full stack avec technologies modernes",
        createdAt: now,
        updatedAt: now,
        userId: userId,
      },
      {
        entreprise: "Startup XYZ",
        poste: "Ingénieur DevOps",
        statut: "Interviewé",
        salaire: "55000€ - 65000€",
        location: "Lyon",
        description: "Déploiement et maintenance d'infrastructures cloud",
        createdAt: now,
        updatedAt: now,
        userId: userId,
      },
      {
        entreprise: "Tech Solutions",
        poste: "Développeur Backend",
        statut: "Job refusé",
        salaire: "45000€ - 55000€",
        location: "Bordeaux",
        description: "Développement d'APIs et services backend",
        createdAt: now,
        updatedAt: now,
        userId: userId,
      },
    ];

    // Utiliser un batch pour créer toutes les candidatures
    const batch = db.batch();
    demoCandidatures.forEach((candidature) => {
      const docRef = db.collection(CANDIDATURES_COLLECTION).doc();
      batch.set(docRef, candidature);
    });

    await batch.commit();

    logger.info(
      `${demoCandidatures.length} candidatures de démonstration créées pour l'utilisateur: ${userId}`
    );
    return demoCandidatures.length;
  } catch (error) {
    logger.error(
      "Erreur lors de la création des candidatures de démonstration:",
      error
    );
    throw error;
  }
}

export default {
  getUserCandidatures,
  getOrphanCandidatures,
  createCandidature,
  updateCandidature,
  deleteCandidature,
  deleteAllUserCandidatures,
  importCandidaturesFromJson,
  createDemoCandidatures,
};
