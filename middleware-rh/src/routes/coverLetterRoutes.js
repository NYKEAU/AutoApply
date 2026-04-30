/**
 * Routes pour la génération de lettres de motivation à partir de templates
 */

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { checkAuth } from "../middleware/authMiddleware.js";
import logger from "../utils/loggerUtils.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, "../../templates/cover-letters");

// Types de CV et versions supportés
const VALID_CV_TYPES = ["IT_SUPPORT", "COORDINATION", "DATA_ANALYSIS"];
const VALID_CV_VERSIONS = ["FR", "EN"];

/**
 * Charge un template depuis le filesystem
 * Retourne null si le fichier n'existe pas
 */
function loadTemplate(cvType, cvVersion, index) {
  const typeSlug = cvType.toLowerCase().replace(/_/g, "-");
  const versionSlug = cvVersion.toLowerCase();
  const filename = `${typeSlug}-${versionSlug}-${index + 1}.md`;
  const filepath = path.join(templatesDir, filename);

  try {
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath, "utf8");
    }
    return null;
  } catch (error) {
    logger.error(`Erreur lecture template ${filename}:`, error);
    return null;
  }
}

/**
 * Charge tous les templates disponibles pour un type/version donné
 */
function loadTemplatesForType(cvType, cvVersion) {
  const templates = [];
  for (let i = 0; i < 10; i++) {
    const tpl = loadTemplate(cvType, cvVersion, i);
    if (tpl) templates.push(tpl);
    else break;
  }
  return templates;
}

/**
 * @route POST /api/cover-letter/generate-from-template
 * @description Génère une lettre de motivation à partir d'un template pré-écrit
 * @access Private
 */
router.post("/generate-from-template", checkAuth, async (req, res) => {
  try {
    const { cv_type, cv_version, entreprise, adresse, ville, province, poste, template_index } = req.body;

    // Validation
    if (!cv_type || !VALID_CV_TYPES.includes(cv_type)) {
      return res.status(400).json({
        success: false,
        error: `cv_type invalide. Valeurs acceptées : ${VALID_CV_TYPES.join(", ")}`,
      });
    }

    if (!cv_version || !VALID_CV_VERSIONS.includes(cv_version)) {
      return res.status(400).json({
        success: false,
        error: `cv_version invalide. Valeurs acceptées : ${VALID_CV_VERSIONS.join(", ")}`,
      });
    }

    if (!entreprise || !poste) {
      return res.status(400).json({
        success: false,
        error: "entreprise et poste sont requis",
      });
    }

    // Charger les templates disponibles
    const templates = loadTemplatesForType(cv_type, cv_version);

    if (templates.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Aucun template trouvé pour ${cv_type} / ${cv_version}. Vérifiez le dossier templates/cover-letters/`,
      });
    }

    // Sélectionner le template
    let selectedIndex = template_index;
    if (selectedIndex === null || selectedIndex === undefined) {
      selectedIndex = Math.floor(Math.random() * templates.length);
    }

    if (selectedIndex < 0 || selectedIndex >= templates.length) {
      return res.status(400).json({
        success: false,
        error: `template_index invalide. Valeurs acceptées : 0 à ${templates.length - 1}`,
      });
    }

    const template = templates[selectedIndex];

    // Remplacer les variables
    const now = new Date();
    const dateLocale = cv_version === "FR"
      ? now.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
      : now.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

    const recruteurNom = req.body.recruteur_nom?.trim();
    const sourceOffre = req.body.source_offre || "";

    let coverLetter = template
      .replace(/{POSTE}/g, poste)
      .replace(/{ENTREPRISE}/g, entreprise)
      .replace(/{ADRESSE}/g, adresse || "")
      .replace(/{VILLE}/g, ville || "")
      .replace(/{PROVINCE}/g, province || "")
      .replace(/{DATE}/g, dateLocale)
      .replace(/{CV_DATE}/g, dateLocale)
      .replace(/{SOURCE_OFFRE}/g, sourceOffre);

    // Gestion du nom recruteur : si vide, remplacer toute la ligne "{NOM_RECRUTEUR}," par "Madame, Monsieur,"
    if (recruteurNom) {
      coverLetter = coverLetter.replace(/{NOM_RECRUTEUR}/g, recruteurNom);
    } else {
      // Supprimer les lignes contenant uniquement {NOM_RECRUTEUR} + ponctuation
      coverLetter = coverLetter.replace(/^.*{NOM_RECRUTEUR}.*$/gm, "Madame, Monsieur,");
    }

    // Nettoyer : lignes qui ne contiennent qu'une virgule ou ponctuation seule
    coverLetter = coverLetter.replace(/^\s*,\s*$/gm, "Madame, Monsieur,");
    // Nettoyer : lignes vides de variables non remplacées (ex: adresse vide → ", QC")
    coverLetter = coverLetter.replace(/^\s*,\s+/gm, "");

    logger.info(`LM générée : ${cv_type}/${cv_version} template #${selectedIndex} pour ${entreprise}`);

    res.json({
      success: true,
      cover_letter: coverLetter,
      template_index: selectedIndex,
      template_count: templates.length,
    });
  } catch (error) {
    logger.error("Erreur lors de la génération de la LM:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la génération de la lettre de motivation",
    });
  }
});

/**
 * @route GET /api/cover-letter/templates
 * @description Liste les templates disponibles par type et version
 * @access Private
 */
router.get("/templates", checkAuth, async (req, res) => {
  try {
    const available = {};
    for (const cvType of VALID_CV_TYPES) {
      available[cvType] = {};
      for (const cvVersion of VALID_CV_VERSIONS) {
        available[cvType][cvVersion] = loadTemplatesForType(cvType, cvVersion).length;
      }
    }

    res.json({ success: true, templates: available });
  } catch (error) {
    logger.error("Erreur lors du listing des templates:", error);
    res.status(500).json({ success: false, error: "Erreur lors du listing des templates" });
  }
});

export default router;
