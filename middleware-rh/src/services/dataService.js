/**
 * Service pour la gestion des données et des offres d'emploi
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../utils/loggerUtils.js";

// Recréer __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers le fichier des offres
const OFFRES_FILE = path.join(__dirname, "../../data/offres.json");

/**
 * Charge les offres d'emploi depuis le fichier JSON
 * @returns {Array} - Liste des offres d'emploi
 */
function loadOffres() {
  try {
    if (fs.existsSync(OFFRES_FILE)) {
      const offresData = fs.readFileSync(OFFRES_FILE, "utf8");
      return JSON.parse(offresData);
    } else {
      // Initialiser avec un tableau vide si le fichier n'existe pas
      saveOffres([]);
      return [];
    }
  } catch (error) {
    logger.error("Erreur lors du chargement des offres d'emploi", error);
    return [];
  }
}

/**
 * Sauvegarde les offres d'emploi dans le fichier JSON
 * @param {Array} offres - Liste des offres d'emploi
 */
function saveOffres(offres) {
  try {
    const offresDir = path.dirname(OFFRES_FILE);
    if (!fs.existsSync(offresDir)) {
      fs.mkdirSync(offresDir, { recursive: true });
    }
    fs.writeFileSync(OFFRES_FILE, JSON.stringify(offres, null, 2));
  } catch (error) {
    logger.error("Erreur lors de la sauvegarde des offres d'emploi", error);
  }
}

/**
 * Récupère toutes les offres d'emploi
 * @returns {Array} - Liste des offres d'emploi
 */
function getAllOffres() {
  return loadOffres();
}

/**
 * Récupère une offre d'emploi par son ID
 * @param {number} id - ID de l'offre d'emploi
 * @returns {Object|null} - Offre d'emploi ou null si non trouvée
 */
function getOffreById(id) {
  const offres = loadOffres();
  return offres.find((offre) => offre.id === parseInt(id)) || null;
}

/**
 * Ajoute une nouvelle offre d'emploi
 * @param {Object} offre - Données de l'offre d'emploi
 * @returns {Object} - Offre d'emploi ajoutée
 */
function addOffre(offre) {
  const offres = loadOffres();

  // Générer un nouvel ID
  const newId =
    offres.length > 0 ? Math.max(...offres.map((o) => o.id)) + 1 : 1;

  // Ajouter la date d'ajout
  const newOffre = {
    ...offre,
    id: newId,
    dateAjout: new Date().toISOString(),
  };

  offres.push(newOffre);
  saveOffres(offres);

  logger.info("Nouvelle offre d'emploi ajoutée", { id: newId });
  return newOffre;
}

/**
 * Met à jour une offre d'emploi existante
 * @param {number} id - ID de l'offre d'emploi
 * @param {Object} offreData - Données de l'offre d'emploi
 * @returns {Object|null} - Offre d'emploi mise à jour ou null si non trouvée
 */
function updateOffre(id, offreData) {
  const offres = loadOffres();
  const index = offres.findIndex((offre) => offre.id === parseInt(id));

  if (index === -1) {
    return null;
  }

  // Mettre à jour l'offre
  const updatedOffre = {
    ...offres[index],
    ...offreData,
    id: parseInt(id), // Conserver l'ID d'origine
  };

  offres[index] = updatedOffre;
  saveOffres(offres);

  logger.info("Offre d'emploi mise à jour", { id });
  return updatedOffre;
}

/**
 * Supprime une offre d'emploi
 * @param {number} id - ID de l'offre d'emploi
 * @returns {boolean} - True si l'offre a été supprimée, false sinon
 */
function deleteOffre(id) {
  const offres = loadOffres();
  const initialLength = offres.length;

  const filteredOffres = offres.filter((offre) => offre.id !== parseInt(id));

  if (filteredOffres.length === initialLength) {
    return false;
  }

  saveOffres(filteredOffres);
  logger.info("Offre d'emploi supprimée", { id });
  return true;
}

export default {
  getAllOffres,
  getOffreById,
  addOffre,
  updateOffre,
  deleteOffre,
};
