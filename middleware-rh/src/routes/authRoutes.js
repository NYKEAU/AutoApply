/**
 * Routes d'authentification
 * Ce fichier définit toutes les routes liées à l'authentification
 */

import express from "express";
import { firebaseAdmin } from "../config/firebase.js";
import logger from "../utils/loggerUtils.js";
import config from "../config.js";
import jwt from "jsonwebtoken";
import { checkAuth } from "../middleware/authMiddleware.js";
import prisma from "../lib/prisma.js";

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @description Enregistre un nouvel utilisateur
 * @access Public
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email et mot de passe requis",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Le mot de passe doit contenir au moins 6 caractères",
      });
    }

    // Créer l'utilisateur dans Firebase
    const userRecord = await firebaseAdmin.auth().createUser({
      email,
      password,
      displayName: displayName || email.split("@")[0],
      emailVerified: false,
    });

    logger.info(`Nouvel utilisateur créé: ${userRecord.uid}`);

    // Créer l'utilisateur dans notre base de données
    const user = await prisma.user.create({
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || email.split("@")[0],
      },
    });

    // Générer un token personnalisé
    const token = await firebaseAdmin.auth().createCustomToken(userRecord.uid);

    // Créer un JWT maison pour stocker dans les cookies
    const jwtToken = jwt.sign(
      {
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
        },
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
      }
    );

    // Configuration des cookies
    const cookieOptions = {
      maxAge: 24 * 60 * 60 * 1000, // 24 heures
      httpOnly: true,
      secure: config.server.env === "production",
      sameSite: "strict",
    };

    // Ajouter le token dans les cookies avec préfixe JWT
    res.cookie("token", `JWT:${jwtToken}`, cookieOptions);

    res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès",
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
      firebaseToken: token,
      token: jwtToken,
    });
  } catch (error) {
    logger.error("Erreur lors de l'inscription:", error);

    // Gestion spécifique des erreurs Firebase
    if (error.code === "auth/email-already-exists") {
      return res.status(400).json({
        success: false,
        error: "Cet email est déjà utilisé",
      });
    }

    if (error.code === "auth/invalid-email") {
      return res.status(400).json({
        success: false,
        error: "Format d'email invalide",
      });
    }

    if (error.code === "auth/weak-password") {
      return res.status(400).json({
        success: false,
        error: "Le mot de passe doit contenir au moins 6 caractères",
      });
    }

    res.status(500).json({
      success: false,
      error: "Erreur lors de l'inscription",
    });
  }
});

/**
 * @route POST /api/auth/login
 * @description Authentifie un utilisateur
 * @access Public
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email et mot de passe requis",
      });
    }

    // Authentifier avec Firebase
    const signInResult = await firebaseAdmin.auth().getUserByEmail(email);

    // Vérifier si l'utilisateur existe dans notre base de données
    let user = await prisma.user.findUnique({
      where: { uid: signInResult.uid },
    });

    // Si l'utilisateur n'existe pas dans notre base, le créer
    if (!user) {
      user = await prisma.user.create({
        data: {
          uid: signInResult.uid,
          email: signInResult.email,
          displayName: signInResult.displayName || email.split("@")[0],
        },
      });

    }

    // Générer un token JWT
    const token = jwt.sign(
      {
        uid: signInResult.uid,
        email: signInResult.email,
        displayName: signInResult.displayName,
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
        algorithm: "HS256",
      }
    );

    // Définir le cookie avec des options de sécurité
    res.cookie("token", token, {
      httpOnly: true,
      secure: config.server.env === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      path: "/",
    });

    // Enregistrer la connexion dans les logs
    logger.info(
      `Utilisateur connecté: ${signInResult.email} (${signInResult.uid})`
    );

    res.json({
      success: true,
      message: "Connexion réussie",
      user: {
        uid: signInResult.uid,
        email: signInResult.email,
        displayName: signInResult.displayName,
      },
      token,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    logger.error("Erreur lors de la connexion:", error);

    // Gérer les erreurs spécifiques de Firebase
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password"
    ) {
      return res.status(401).json({
        success: false,
        error: "Email ou mot de passe incorrect",
      });
    }

    res.status(500).json({
      success: false,
      error: "Erreur lors de la connexion",
    });
  }
});

/**
 * @route GET /api/auth/logout
 * @desc Déconnexion d'un utilisateur
 * @access Public
 */
router.get("/logout", (req, res) => {
  try {
    // Supprimer le cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: config.server.env === "production",
      sameSite: "strict",
      path: "/",
    });

    // Journaliser la déconnexion
    logger.info("Utilisateur déconnecté");

    res.status(200).json({
      success: true,
      message: "Déconnexion réussie",
    });
  } catch (error) {
    logger.error("Erreur lors de la déconnexion:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la déconnexion",
    });
  }
});

/**
 * @route GET /api/auth/me
 * @description Récupère les informations de l'utilisateur connecté
 * @access Private
 */
router.get("/me", async (req, res) => {
  try {
    // Vérifier si le token est présent
    const token =
      req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Non authentifié",
      });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Récupérer les informations de l'utilisateur depuis Firebase
    const userRecord = await firebaseAdmin.auth().getUser(decoded.uid);

    res.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
      },
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des informations utilisateur:",
      error
    );

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        error: "Token invalide ou expiré",
      });
    }

    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des informations utilisateur",
    });
  }
});

/**
 * @route GET /api/auth/user
 * @desc Récupérer les informations de l'utilisateur connecté
 * @access Private
 */
router.get("/user", checkAuth, async (req, res) => {
  try {
    // Les informations utilisateur sont déjà disponibles dans req.user grâce au middleware checkAuth
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des infos utilisateur:",
      error
    );
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des informations utilisateur",
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Déconnexion d'un utilisateur
 * @access Public
 */
router.post("/logout", (req, res) => {
  try {
    // Supprimer le cookie
    res.clearCookie("token");

    res.status(200).json({
      success: true,
      message: "Déconnexion réussie",
    });
  } catch (error) {
    logger.error("Erreur lors de la déconnexion:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la déconnexion",
    });
  }
});

/**
 * @route GET /api/auth/token
 * @desc Retourne un JWT frais pour l'utilisateur connecté (usage extension Chrome)
 * @access Private
 */
router.get("/token", checkAuth, (req, res) => {
  const token = jwt.sign(
    { uid: req.user.uid, email: req.user.email, displayName: req.user.displayName },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn, algorithm: "HS256" }
  );
  res.json({ success: true, token });
});

/**
 * @route GET /api/auth/google
 * @desc Redirection vers l'authentification Google (route de redirection)
 * @access Public
 */
router.get("/google", (req, res) => {
  // Dans une implémentation réelle, rediriger vers l'authentification Google
  // Ici, nous simulons en renvoyant un message
  res.status(501).json({
    success: false,
    message: "Authentification Google non implémentée",
  });
});

export default router;
