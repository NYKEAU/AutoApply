/**
 * Script d'importation des candidatures depuis le fichier JSON vers Firebase Firestore
 * Usage: npm run import-candidatures
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

// Chargement des variables d'environnement
dotenv.config();

// Configuration du chemin vers le fichier de données
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, "../data/candidatures.json");

// Configuration de Firebase Admin SDK
let firebaseApp;
try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  console.log("Firebase Admin SDK initialisé avec succès");
} catch (error) {
  console.error(
    "Erreur lors de l'initialisation de Firebase Admin SDK:",
    error
  );
  process.exit(1);
}

// Récupérer une référence à Firestore
const db = firebaseApp.firestore();
const CANDIDATURES_COLLECTION = "candidatures";

/**
 * Fonction principale d'importation
 */
async function importCandidatures() {
  try {
    console.log("Début de l'importation des candidatures...");

    // Vérifier si le fichier JSON existe
    if (!fs.existsSync(dataPath)) {
      console.error(`Erreur: Le fichier ${dataPath} n'existe pas`);
      process.exit(1);
    }

    // Lire le fichier JSON
    const rawData = fs.readFileSync(dataPath, "utf8");
    let candidatures;
    try {
      candidatures = JSON.parse(rawData);
    } catch (error) {
      console.error("Erreur lors du parsing du fichier JSON:", error);
      process.exit(1);
    }

    console.log(
      `${candidatures.length} candidatures trouvées dans le fichier JSON`
    );

    // Vérifier si la collection existe déjà et contient des données
    const snapshot = await db
      .collection(CANDIDATURES_COLLECTION)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      console.log("Attention: Des candidatures existent déjà dans Firestore.");
      const answer = await promptUser(
        "Voulez-vous continuer et écraser les données existantes? (y/n): "
      );

      if (answer.toLowerCase() !== "y") {
        console.log("Importation annulée");
        process.exit(0);
      }
    }

    // Utiliser un batch pour l'importation
    let batch = db.batch();
    let batchCount = 0;
    let totalImported = 0;

    // Firebase limite les batch à 500 opérations
    const BATCH_LIMIT = 450;

    for (const candidature of candidatures) {
      const docRef = db.collection(CANDIDATURES_COLLECTION).doc();

      // Convertir les dates en objets Timestamp
      const createdAt = candidature.createdAt
        ? new Date(candidature.createdAt)
        : new Date();
      const updatedAt = candidature.updatedAt
        ? new Date(candidature.updatedAt)
        : new Date();

      // Créer un nouvel objet sans la propriété id
      const { id, ...candidatureData } = candidature;

      batch.set(docRef, {
        ...candidatureData,
        createdAt: admin.firestore.Timestamp.fromDate(createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(updatedAt),
        userId: null,
      });

      batchCount++;
      totalImported++;

      // Si on atteint la limite, on commit le batch et on en crée un nouveau
      if (batchCount >= BATCH_LIMIT) {
        console.log(`Importation de ${batchCount} candidatures...`);
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit du dernier batch s'il reste des documents
    if (batchCount > 0) {
      console.log(`Importation des ${batchCount} candidatures restantes...`);
      await batch.commit();
    }

    console.log(
      `Importation terminée: ${totalImported} candidatures importées avec succès`
    );
    process.exit(0);
  } catch (error) {
    console.error("Erreur lors de l'importation:", error);
    process.exit(1);
  }
}

/**
 * Fonction utilitaire pour demander une confirmation à l'utilisateur
 * @param {string} question - La question à poser
 * @returns {Promise<string>} - La réponse de l'utilisateur
 */
function promptUser(question) {
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer);
    });
  });
}

// Lancer l'importation
importCandidatures();
