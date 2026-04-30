/**
 * Initialisation de Firebase Admin SDK
 * Ce fichier exporte une instance unique de Firebase Admin pour être utilisée dans toute l'application
 */

import admin from "firebase-admin";
import dotenv from "dotenv";
import logger from "../utils/loggerUtils.js";

dotenv.config();

// Vérifier si Firebase Admin est déjà initialisé
let firebaseApp;
try {
  firebaseApp = admin.app();
} catch (error) {
  // Firebase Admin n'est pas initialisé, créer une nouvelle instance
  try {
    // Récupérer les informations de configuration depuis les variables d'environnement
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    logger.info("Firebase Admin SDK initialisé avec succès");
  } catch (initError) {
    logger.error(
      "Erreur lors de l'initialisation de Firebase Admin SDK",
      initError
    );
    throw initError;
  }
}

// Exporter les services Firebase
const auth = firebaseApp.auth();
const db = firebaseApp.firestore();
const rtdb = firebaseApp.database();

// Vérifier la connexion à Firebase
db.collection("test")
  .doc("connection")
  .set({ timestamp: admin.firestore.FieldValue.serverTimestamp() })
  .then(() => {
    logger.info("Connexion à Firebase Firestore validée");
  })
  .catch((error) => {
    logger.error("Erreur de connexion à Firebase Firestore", error);
  });

export { auth, db, rtdb, admin };
export default firebaseApp;
