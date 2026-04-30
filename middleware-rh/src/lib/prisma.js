/**
 * Initialisation de Prisma
 * Ce fichier exporte une instance unique de PrismaClient pour être utilisée dans toute l'application
 */

import { PrismaClient } from "@prisma/client";
import logger from "../utils/loggerUtils.js";

// Déclaration de la variable globale pour stocker l'instance Prisma
const globalForPrisma = global;

// Vérifier si une instance existe déjà dans l'environnement global
const isProduction = process.env.NODE_ENV === "production";
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: isProduction
      ? [{ emit: "event", level: "error" }]
      : [
          { emit: "event", level: "query" },
          { emit: "event", level: "error" },
          { emit: "event", level: "info" },
          { emit: "event", level: "warn" },
        ],
  });

// Ajouter des écouteurs d'événements pour les logs
if (!isProduction) {
  prisma.$on("query", (e) => {
    logger.debug("Prisma Query", {
      query: e.query,
      duration: e.duration,
    });
  });
}

prisma.$on("error", (e) => {
  logger.error("Prisma Error", {
    message: e.message,
    target: e.target,
  });
});

if (!isProduction) {
  prisma.$on("info", (e) => {
    logger.info("Prisma Info", {
      message: e.message,
    });
  });

  prisma.$on("warn", (e) => {
    logger.warn("Prisma Warning", {
      message: e.message,
    });
  });
}

// En développement, connecter Prisma au démarrage
if (process.env.NODE_ENV !== "production") {
  prisma
    .$connect()
    .then(() => {
      logger.info("Prisma connecté à la base de données");
    })
    .catch((error) => {
      logger.error("Erreur de connexion Prisma", error);
    });
}

// Stocker l'instance dans l'environnement global en développement
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
