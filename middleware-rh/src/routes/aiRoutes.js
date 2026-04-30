import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";
import { createRequire } from "module";
import config from "../config.js";
import logger from "../utils/loggerUtils.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const router = express.Router();
const client = new Anthropic({ apiKey: config.ai.anthropicApiKey });
const ALLOWED_MIMETYPES = ["application/pdf"];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers PDF sont acceptés"), false);
    }
  },
});

function checkApiKey(res) {
  if (!config.ai.anthropicApiKey || config.ai.anthropicApiKey.startsWith("sk-ant-REMPLACE")) {
    res.status(503).json({ success: false, error: "Clé API Anthropic non configurée" });
    return false;
  }
  return true;
}

/**
 * @route POST /api/ai/cover-letter
 * @description Génère une lettre de motivation personnalisée
 */
router.post("/cover-letter", async (req, res) => {
  const { entreprise, poste, description, location, profile } = req.body;

  if (!entreprise || !poste) {
    return res.status(400).json({ success: false, error: "Entreprise et poste requis" });
  }
  if (!checkApiKey(res)) return;

  try {
    const locationInfo = location && location !== "Inconnu" ? ` basé à ${location}` : "";
    const descriptionInfo = description
      ? `\n\nDescription du poste :\n${description.substring(0, 2000)}`
      : "";

    const profileSection = profile
      ? `\n\nProfil du candidat (sélectionne UNIQUEMENT les éléments les plus pertinents pour CE poste précis — ne liste pas tout, sois sélectif et naturel) :\n${JSON.stringify(profile)}`
      : "";

    const prompt = `Tu es un expert en recrutement. Génère une lettre de motivation professionnelle et percutante.

Poste : ${poste} chez ${entreprise}${locationInfo}${descriptionInfo}${profileSection}

Consignes STRICTES :
- Commence directement par "Madame, Monsieur,"
- MAXIMUM 300 mots — pas un mot de plus
- 3 paragraphes : accroche/motivation, valeur ajoutée, conclusion
- Utilise 2-3 éléments du profil les plus pertinents pour CE poste, intégrés naturellement
- Pas de liste de compétences, pas de formulations génériques ("je suis passionné par...")
- Ton direct et humain
- Termine par "Veuillez agréer, Madame, Monsieur, mes salutations distinguées."
- En français`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const coverLetter = message.content[0].text;
    logger.info(`LM générée pour ${poste} chez ${entreprise}`);
    res.json({ success: true, coverLetter });
  } catch (error) {
    logger.error("Erreur génération LM:", error);
    res.status(500).json({ success: false, error: "Erreur lors de la génération" });
  }
});

/**
 * @route POST /api/ai/parse-cv
 * @description Parse un CV PDF et extrait les infos de profil structurées
 */
router.post("/parse-cv", upload.single("cv"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "Fichier PDF requis" });
  }
  if (!checkApiKey(res)) return;

  try {
    // Extraire le texte brut du PDF
    const pdfData = await pdfParse(req.file.buffer);
    const rawText = pdfData.text.substring(0, 6000); // limite token raisonnable

    const prompt = `Analyse ce CV et extrait les informations structurées en JSON strict.

CV :
${rawText}

Retourne UNIQUEMENT un JSON valide (sans markdown, sans explication) avec cette structure exacte :
{
  "nom": "Prénom Nom",
  "titre": "Titre / poste actuel ou recherché",
  "email": "email si présent sinon null",
  "telephone": "téléphone si présent sinon null",
  "localisation": "ville/région si présent sinon null",
  "resume": "Résumé de 2-3 phrases du profil : qui est cette personne, sa valeur ajoutée principale",
  "competencesCles": ["compétence 1", "compétence 2", ...],
  "technologies": ["tech 1", "tech 2", ...],
  "langues": ["Français (natif)", "Anglais (courant)", ...],
  "anneesExperience": "ex: 5 ans" ou null,
  "formationPrincipale": "Diplôme le plus pertinent" ou null,
  "pointsForts": ["point fort 1", "point fort 2", "point fort 3"]
}`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].text.trim();
    // Extraire le JSON même si Claude ajoute du texte autour
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Réponse JSON invalide");

    const profile = JSON.parse(jsonMatch[0]);
    logger.info(`CV parsé pour: ${profile.nom}`);
    res.json({ success: true, profile });
  } catch (error) {
    logger.error("Erreur parsing CV:", error);
    res.status(500).json({ success: false, error: "Erreur lors du parsing du CV" });
  }
});

/**
 * @route POST /api/ai/follow-up-email
 * @description Génère un email de relance pour une candidature sans réponse
 */
router.post("/follow-up-email", async (req, res) => {
  const { entreprise, poste, daysSince, profile } = req.body;

  if (!entreprise || !poste) {
    return res.status(400).json({ success: false, error: "Entreprise et poste requis" });
  }
  if (!checkApiKey(res)) return;

  try {
    const profileInfo = profile?.nom ? `\nCandidature envoyée par : ${profile.nom}` : "";
    const prompt = `Génère un email de relance court et professionnel pour une candidature sans réponse.

Entreprise : ${entreprise}
Poste : ${poste}
Jours depuis la candidature : ${daysSince || "7+"}${profileInfo}

Consignes STRICTES :
- Objet de l'email en première ligne : "Objet : [objet]"
- Ligne vide, puis le corps de l'email
- MAXIMUM 120 mots
- Ton poli, direct, pas insistant
- Rappeler brièvement sa candidature et sa motivation
- Proposer un échange
- Commence par "Madame, Monsieur,"
- Formule de politesse courte à la fin
- En français`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ success: true, email: message.content[0].text });
  } catch (error) {
    logger.error("Erreur génération email de relance:", error);
    res.status(500).json({ success: false, error: "Erreur lors de la génération" });
  }
});

/**
 * @route POST /api/ai/compress-profile
 * @description Génère un résumé compressé du profil (~150 mots) pour réutilisation
 */
router.post("/compress-profile", async (req, res) => {
  const { profile } = req.body;
  if (!profile) return res.status(400).json({ success: false, error: "Profil requis" });
  if (!checkApiKey(res)) return;

  try {
    const prompt = `Résume ce profil candidat en 1 paragraphe dense de 100-150 mots maximum. Inclus : nom, titre/rôle, années d'expérience, compétences clés, stack technique, langues, points forts distinctifs. Sois factuel et concis, pas de mise en forme.

Profil :
${JSON.stringify(profile)}`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 250,
      messages: [{ role: "user", content: prompt }],
    });

    const summary = message.content[0].text.trim();
    res.json({ success: true, summary });
  } catch (error) {
    logger.error("Erreur compression profil:", error);
    res.status(500).json({ success: false, error: "Erreur lors de la compression" });
  }
});

/**
 * @route POST /api/ai/compatibility-score
 * @description Analyse la compatibilité entre le profil et une offre
 */
router.post("/compatibility-score", async (req, res) => {
  const { entreprise, poste, description, profile, profileSummary } = req.body;

  if ((!profile && !profileSummary) || !poste) {
    return res.status(400).json({ success: false, error: "Profil et poste requis" });
  }
  if (!checkApiKey(res)) return;

  try {
    const descInfo = description ? `\nDescription :\n${description.substring(0, 2000)}` : "";
    // Utilise le résumé compressé si disponible (économie ~60% de tokens input)
    const profilText = profileSummary || JSON.stringify(profile);
    const prompt = `Analyse la compatibilité entre ce profil candidat et cette offre d'emploi.

Poste : ${poste} chez ${entreprise}${descInfo}

Profil candidat :
${profilText}

Retourne UNIQUEMENT un JSON valide (sans markdown) :
{
  "score": 0-100,
  "verdict": "une phrase courte ex: Bon match, profil backend solide",
  "points_forts": ["max 3 points qui matchent bien"],
  "points_faibles": ["max 2 manques ou écarts"],
  "conseil": "une action concrète pour améliorer ses chances"
}`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Réponse JSON invalide");
    const result = JSON.parse(jsonMatch[0]);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error("Erreur score compatibilité:", error);
    res.status(500).json({ success: false, error: "Erreur lors de l'analyse" });
  }
});

export default router;
