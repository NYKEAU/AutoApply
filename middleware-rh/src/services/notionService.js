/**
 * Service pour l'intégration avec Notion
 */

import axios from "axios";
import config from "../config.js";
import logger from "../utils/loggerUtils.js";

const NOTION_API_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

/**
 * Client Axios configuré pour Notion
 */
const notionClient = axios.create({
  baseURL: NOTION_API_URL,
  headers: {
    Authorization: `Bearer ${config.notion.secret}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  },
});

/**
 * Récupère les candidatures existantes depuis Notion
 * @returns {Promise<Array>} - Liste des candidatures dans Notion
 */
async function fetchExistingCandidaturesFromNotion() {
  try {
    const response = await notionClient.post(
      `/databases/${config.notion.databaseId}/query`
    );

    return response.data.results.map((page) => {
      const properties = page.properties;

      return {
        entreprise: properties.Name?.title[0]?.text?.content || "",
        poste: properties.Position?.multi_select[0]?.name || "",
        statut: properties.Status?.status?.name || "",
        nextDeadline: properties.NextDeadline?.date?.start || "",
        salary: properties.Salary?.rich_text[0]?.text?.content || "",
        applicationLink: properties.ApplicationLink?.url || "",
        location: properties.Location?.rich_text[0]?.text?.content || "",
        hrDetails: properties.HRDetails?.rich_text[0]?.text?.content || "",
      };
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des candidatures depuis Notion",
      error
    );
    throw error;
  }
}

/**
 * Convertit une candidature en format Notion
 * @param {Object} candidature - Candidature à convertir
 * @returns {Object} - Données formatées pour Notion
 */
function formatCandidatureForNotion(candidature) {
  const validStatuses = [
    "Interested",
    "Interviewed",
    "Applied",
    "Job accepted",
  ];
  let statut = candidature.statut || "Applied";

  // Vérifier si le statut est valide
  if (!validStatuses.includes(statut)) {
    logger.warn(
      `Statut invalide: ${statut}. Utilisation de "Applied" par défaut.`
    );
    statut = "Applied";
  }

  // Préparer les données pour Notion
  return {
    parent: { database_id: config.notion.databaseId },
    properties: {
      Name: {
        title: [{ text: { content: candidature.entreprise } }],
      },
      Position: {
        multi_select: [{ name: candidature.poste }],
      },
      Status: {
        status: {
          name: statut,
        },
      },
      // N'incluez pas NextDeadline si c'est null
      ...(candidature.nextDeadline && candidature.nextDeadline !== "Non défini"
        ? {
            NextDeadline: {
              date: {
                start: new Date(candidature.nextDeadline).toISOString(),
              },
            },
          }
        : {}),
      Salary: {
        rich_text: [{ text: { content: candidature.salary || "Non défini" } }],
      },
      ApplicationLink: {
        url: candidature.applicationLink,
      },
      Location: {
        rich_text: [
          { text: { content: candidature.location || "Non défini" } },
        ],
      },
      HRDetails: {
        rich_text: [
          {
            text: {
              content:
                (candidature.hrDetails || "Non défini").slice(0, 500) + "...",
            },
          },
        ],
      },
    },
  };
}

/**
 * Synchronise les candidatures avec Notion
 * @param {Array} candidatures - Liste des candidatures à synchroniser
 * @returns {Promise<Object>} - Résultat de la synchronisation
 */
async function syncCandidaturesToNotion(candidatures) {
  try {
    const existingCandidatures = await fetchExistingCandidaturesFromNotion();
    let syncedCount = 0;
    let skippedCount = 0;

    for (const candidature of candidatures) {
      // Vérifier si la candidature existe déjà dans Notion
      const exists = existingCandidatures.some(
        (existing) =>
          existing.entreprise === candidature.entreprise &&
          existing.poste === candidature.poste &&
          existing.statut === candidature.statut &&
          existing.nextDeadline === candidature.nextDeadline &&
          existing.salary === candidature.salary &&
          existing.applicationLink === candidature.applicationLink &&
          existing.location === candidature.location &&
          existing.hrDetails === candidature.hrDetails
      );

      if (exists) {
        logger.info(
          `Candidature déjà existante : ${candidature.entreprise} - ${candidature.poste}`
        );
        skippedCount++;
        continue;
      }

      // Formater la candidature pour Notion
      const notionData = formatCandidatureForNotion(candidature);

      // Créer la page dans Notion
      await notionClient.post("/pages", notionData);
      syncedCount++;
    }

    return {
      success: true,
      syncedCount,
      skippedCount,
      totalCount: candidatures.length,
    };
  } catch (error) {
    logger.error("Erreur lors de la synchronisation avec Notion", error);
    throw error;
  }
}

export default {
  fetchExistingCandidaturesFromNotion,
  syncCandidaturesToNotion,
};
