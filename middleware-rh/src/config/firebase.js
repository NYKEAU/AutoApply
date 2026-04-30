/**
 * Configuration Firebase
 * Ce fichier initialise l'admin SDK Firebase pour l'authentification
 */

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../utils/loggerUtils.js";
import config from "../config.js";

// Recréer __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialiser Firebase Admin
const initializeFirebase = () => {
  try {
    // Vérifie si Firebase est déjà initialisé
    if (admin.apps.length > 0) {
      return admin;
    }

    let firebaseConfig;

    // En mode développement, utiliser le fichier JSON local
    const serviceAccountPath = path.join(__dirname, "../../firebase-service-account.json");
    
    if (fs.existsSync(serviceAccountPath)) {
      logger.debug(`Initialisation de Firebase avec le fichier ${serviceAccountPath}`);
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      
      firebaseConfig = {
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      };
    } 
    // En mode production, utiliser les variables d'environnement
    else if (process.env.FIREBASE_PROJECT_ID) {
      logger.debug("Initialisation de Firebase avec les variables d'environnement");
      if (!process.env.FIREBASE_PRIVATE_KEY) {
        throw new Error("FIREBASE_PRIVATE_KEY est requis quand FIREBASE_SERVICE_ACCOUNT_PATH n'est pas disponible");
      }
      firebaseConfig = {
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      };
    } else {
      throw new Error("Aucune configuration Firebase trouvée");
    }

    // Initialiser Firebase
    admin.initializeApp(firebaseConfig);
    return admin;
  } catch (error) {
    logger.error("Erreur lors de l'initialisation de Firebase:", error);
    throw new Error(`Erreur lors de l'initialisation de Firebase: ${error.message}`);
  }
};

// Initialiser Firebase et exporter l'instance
const firebaseAdmin = initializeFirebase();
// Exporter à la fois comme export par défaut et export nommé pour la compatibilité
export { firebaseAdmin };
export default firebaseAdmin;