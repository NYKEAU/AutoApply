/**
 * Middleware d'authentification
 * Ce fichier contient les middlewares pour vérifier l'authentification des utilisateurs
 */

import jwt from "jsonwebtoken";
import { firebaseAdmin } from "../config/firebase.js";
import config from "../config.js";
import logger from "../utils/loggerUtils.js";
import prisma from "../lib/prisma.js";

/**
 * Middleware pour vérifier l'authentification via JWT
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction suivante
 */
export const checkAuth = async (req, res, next) => {
  try {
    // Vérifier si le token est présent dans les cookies ou l'en-tête Authorization
    const token =
      req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Accès non autorisé. Veuillez vous connecter.",
      });
    }

    try {
      // Vérifier et décoder le token JWT en spécifiant l'algorithme
      const decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: ["HS256"],
      });

      // Vérifier si l'utilisateur existe toujours dans Firebase
      try {
        // Si Firebase est disponible, vérifier l'utilisateur
        if (firebaseAdmin) {
          const userRecord = await firebaseAdmin.auth().getUser(decoded.uid);

          // Ajouter les informations de l'utilisateur à la requête
          req.user = {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            photoURL: userRecord.photoURL,
          };
        } else {
          // Si Firebase n'est pas disponible, utiliser les informations du token
          req.user = {
            uid: decoded.uid,
            email: decoded.email,
            displayName: decoded.displayName,
            photoURL: decoded.photoURL,
          };

          logger.warn(
            "Firebase Admin SDK non disponible, utilisation des informations du token JWT"
          );
        }

        next();
      } catch (firebaseError) {
        logger.error(
          "Erreur lors de la vérification de l'utilisateur Firebase:",
          firebaseError
        );

        // En mode développement, permettre l'accès même si Firebase n'est pas disponible
        if (config.server.env === "development") {
          req.user = decoded;
          logger.warn(
            "Mode développement: Accès autorisé malgré l'erreur Firebase"
          );
          next();
        } else {
          return res.status(401).json({
            success: false,
            error: "Session invalide. Veuillez vous reconnecter.",
          });
        }
      }
    } catch (jwtError) {
      logger.error("Erreur de vérification JWT:", jwtError);

      // Supprimer le cookie invalide
      res.clearCookie("token");

      return res.status(401).json({
        success: false,
        error: "Token invalide ou expiré. Veuillez vous reconnecter.",
      });
    }
  } catch (error) {
    logger.error("Erreur d'authentification:", error);
    return res.status(401).json({
      success: false,
      error: "Erreur d'authentification. Veuillez vous reconnecter.",
    });
  }
};

/**
 * Middleware pour vérifier l'authentification pour les routes web
 * Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
 */
export const checkAuthWeb = (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.redirect("/login");
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: ["HS256"],
      });
      req.user = decoded;
      next();
    } catch (error) {
      // Token invalide ou expiré
      res.clearCookie("token");
      return res.redirect("/login");
    }
  } catch (error) {
    logger.error("Erreur d'authentification web:", error);
    return res.redirect("/login");
  }
};

export default { checkAuth, checkAuthWeb };
