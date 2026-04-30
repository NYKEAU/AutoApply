/**
 * Utilitaires pour vérifier la santé du serveur
 * Ce module fournit des fonctions pour vérifier l'état de santé du serveur
 * et de ses dépendances (base de données, services externes, etc.)
 */

import logger from "./loggerUtils.js";
import config from "../config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

// Recréer __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Instance Prisma pour les vérifications de base de données
const prisma = new PrismaClient();

/**
 * Vérifie la santé globale du serveur
 * @returns {Promise<boolean>} true si le serveur est en bonne santé, false sinon
 */
export async function checkServerHealth() {
  try {
    // Vérifier l'accès au système de fichiers
    const fileSystemOk = checkFileSystem();

    // Vérifier la connexion à la base de données si configurée
    const databaseOk = config.database.url
      ? await checkDatabaseConnection()
      : true;

    // Vérifier l'accès aux services externes si configurés
    const notionOk = config.notion.enabled ? await checkNotionAccess() : true;

    // Vérifier l'espace disque disponible
    const diskSpaceOk = checkDiskSpace();

    // Vérifier la mémoire disponible
    const memoryOk = checkMemory();

    // Résultat global
    const isHealthy =
      fileSystemOk && databaseOk && notionOk && diskSpaceOk && memoryOk;

    if (!isHealthy) {
      logger.warn("Vérification de santé échouée", {
        fileSystem: fileSystemOk,
        database: databaseOk,
        notion: notionOk,
        diskSpace: diskSpaceOk,
        memory: memoryOk,
      });
    }

    return isHealthy;
  } catch (error) {
    logger.error("Erreur lors de la vérification de santé du serveur", error);
    return false;
  }
}

/**
 * Vérifie l'accès au système de fichiers
 * @returns {boolean} true si le système de fichiers est accessible, false sinon
 */
function checkFileSystem() {
  try {
    // Vérifier l'accès au dossier public
    const publicDir = path.join(__dirname, "../../public");
    fs.accessSync(publicDir, fs.constants.R_OK);

    // Vérifier l'accès au dossier de données
    const dataDir = path.join(__dirname, "../../public/data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    return true;
  } catch (error) {
    logger.error(
      "Erreur lors de la vérification du système de fichiers",
      error
    );
    return false;
  }
}

/**
 * Vérifie la connexion à la base de données
 * @returns {Promise<boolean>} true si la connexion à la base de données est établie, false sinon
 */
async function checkDatabaseConnection() {
  try {
    // Exécuter une requête simple pour vérifier la connexion
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error(
      "Erreur lors de la vérification de la connexion à la base de données",
      error
    );
    return false;
  } finally {
    // Libérer les ressources
    await prisma.$disconnect();
  }
}

/**
 * Vérifie l'accès à l'API Notion
 * @returns {Promise<boolean>} true si l'API Notion est accessible, false sinon
 */
async function checkNotionAccess() {
  // Simuler une vérification pour le moment
  // Dans une implémentation réelle, il faudrait faire une requête à l'API Notion
  return true;
}

/**
 * Vérifie l'espace disque disponible
 * @returns {boolean} true si l'espace disque est suffisant, false sinon
 */
function checkDiskSpace() {
  // Simuler une vérification pour le moment
  // Dans une implémentation réelle, il faudrait vérifier l'espace disque disponible
  return true;
}

/**
 * Vérifie la mémoire disponible
 * @returns {boolean} true si la mémoire est suffisante, false sinon
 */
function checkMemory() {
  // Simuler une vérification pour le moment
  // Dans une implémentation réelle, il faudrait vérifier la mémoire disponible
  return true;
}
