# AutoApply - Middleware

![AutoApply Logo](public/images/logo.png)

## Description

AutoApply est une application web qui permet de gérer et de suivre vos candidatures d'emploi. Ce middleware sert d'interface entre l'extension de navigateur AutoApply et les services externes comme Notion. Il offre une interface utilisateur conviviale pour visualiser, gérer et analyser vos candidatures.

## Fonctionnalités

- **Authentification** : Système complet d'authentification avec Firebase
- **Tableau de bord** : Visualisez vos statistiques de candidature avec des graphiques interactifs
- **Gestion des candidatures** : Ajoutez, modifiez et supprimez vos candidatures
- **Synchronisation Notion** : Synchronisez vos candidatures avec une base de données Notion
- **Assistant IA** : Obtenez des conseils et des analyses de vos candidatures grâce à l'IA
- **Thème clair/sombre** : Interface adaptable à vos préférences
- **Responsive** : Fonctionne sur tous les appareils (ordinateurs, tablettes, smartphones)
- **Paramètres personnalisables** : Configurez vos propres clés API pour Notion et Perplexity

## Prérequis

- Node.js 18.0.0 ou supérieur
- NPM ou Yarn
- Base de données PostgreSQL
- Projet Firebase (pour l'authentification)

## Installation

1. Clonez le dépôt :

   ```bash
   git clone https://github.com/nykeau/AutoApply.git
   cd AutoApply/middleware-rh
   ```

2. Installez les dépendances :

   ```bash
   npm install
   ```

3. Créez un fichier `.env` à partir du modèle `.env.example` :

   ```bash
   cp .env.example .env
   ```

4. Modifiez le fichier `.env` avec vos propres valeurs.

5. Configurez Firebase :

   - Créez un projet Firebase sur [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Activez l'authentification par email/mot de passe et Google
   - Créez une application web et notez les informations de configuration
   - Générez un compte de service Firebase Admin SDK et téléchargez le fichier JSON
   - Placez le fichier JSON dans le répertoire racine du projet ou configurez les variables d'environnement

6. Configurez la base de données PostgreSQL :

   - Créez une base de données PostgreSQL
   - Exécutez les migrations Prisma :
     ```bash
     npx prisma migrate dev
     ```

7. Démarrez le serveur de développement :

   ```bash
   npm run dev
   ```

8. Accédez à l'application dans votre navigateur à l'adresse `http://localhost:3000`

## Configuration

### Variables d'environnement

Le fichier `.env` contient les variables d'environnement nécessaires au fonctionnement de l'application :

- `PORT` : Port sur lequel le serveur écoute (par défaut : 3000)
- `NODE_ENV` : Environnement d'exécution (`development`, `production`)
- `BASE_URL` : URL de base de l'application (sans slash final)
- `DATABASE_URL` : URL de connexion à la base de données PostgreSQL
- `NOTION_TOKEN` : Token d'API Notion (optionnel)
- `NOTION_DATABASE_ID` : ID de la base de données Notion (optionnel)
- `PERPLEXITY_API_KEY` : Clé API Perplexity pour l'IA (optionnel)
- `SSL_KEY_PATH` : Chemin vers la clé privée SSL (pour HTTPS)
- `SSL_CERT_PATH` : Chemin vers le certificat SSL (pour HTTPS)
- `FIREBASE_SERVICE_ACCOUNT_PATH` : Chemin vers le fichier JSON du compte de service Firebase
- `FIREBASE_DATABASE_URL` : URL de la base de données Firebase
- `FIREBASE_PROJECT_ID` : ID du projet Firebase
- `FIREBASE_CLIENT_EMAIL` : Email du client Firebase
- `FIREBASE_PRIVATE_KEY` : Clé privée Firebase
- `JWT_SECRET` : Clé secrète pour la génération des JWT
- `JWT_EXPIRES_IN` : Durée de validité des JWT (par défaut : 7d)
- `SESSION_SECRET` : Clé secrète pour les sessions

### Configuration de Firebase

Pour utiliser l'authentification Firebase, vous devez :

1. Créer un projet Firebase sur [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Activer l'authentification par email/mot de passe et Google
3. Créer une application web et noter les informations de configuration
4. Générer un compte de service Firebase Admin SDK et télécharger le fichier JSON
5. Placer le fichier JSON dans le répertoire racine du projet ou configurer les variables d'environnement

### Configuration de Notion

Pour utiliser l'intégration Notion, vous devez :

1. Créer une intégration Notion sur [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Obtenir le token d'API de l'intégration
3. Créer une base de données Notion avec la structure requise
4. Partager la base de données avec votre intégration
5. Obtenir l'ID de la base de données (depuis l'URL)

## Déploiement en production

1. Construisez l'application pour la production :

   ```bash
   npm run build
   ```

2. Démarrez le serveur en mode production :
   ```bash
   NODE_ENV=production npm start
   ```

### Avec Docker

1. Construisez l'image Docker :

   ```bash
   docker build -t autoapply-middleware .
   ```

2. Exécutez le conteneur :
   ```bash
   docker run -p 3000:3000 --env-file .env autoapply-middleware
   ```

## Structure du projet

```
middleware-rh/
├── data/                  # Données temporaires et fichiers de configuration
├── prisma/                # Schéma et migrations Prisma
├── public/                # Fichiers statiques (HTML, CSS, JS, images)
├── src/
│   ├── config.js          # Configuration centralisée
│   ├── config/            # Fichiers de configuration spécifiques
│   │   └── firebase.js    # Configuration de Firebase
│   ├── app.js             # Configuration de l'application Express
│   ├── middleware/        # Middlewares Express
│   │   └── authMiddleware.js # Middleware d'authentification
│   ├── routes/            # Routes de l'API
│   │   ├── authRoutes.js  # Routes d'authentification
│   │   ├── candidatureRoutes.js # Routes pour les candidatures
│   │   └── ...
│   ├── services/          # Services métier
│   ├── utils/             # Utilitaires
│   └── ...
├── .env                   # Variables d'environnement (à créer)
├── .env.example           # Exemple de variables d'environnement
├── server.js              # Point d'entrée de l'application
├── package.json           # Dépendances et scripts
└── README.md              # Documentation
```

## API

L'API REST expose les endpoints suivants :

### Authentification

- `POST /api/auth/register` : Inscription d'un nouvel utilisateur
- `POST /api/auth/login` : Connexion d'un utilisateur
- `GET /api/auth/logout` : Déconnexion de l'utilisateur
- `GET /api/auth/me` : Récupération des informations de l'utilisateur connecté

### Candidatures

- `GET /api/candidatures` : Récupération des candidatures de l'utilisateur connecté
- `POST /api/candidatures` : Création d'une candidature
- `PUT /api/candidatures/:id` : Mise à jour d'une candidature
- `DELETE /api/candidatures/:id` : Suppression d'une candidature

### Autres

- `GET /api/health` : Vérification de l'état de santé de l'API
- `POST /api/notion/sync` : Synchronisation avec Notion
- `POST /api/chat` : Interaction avec l'assistant IA
- `GET /api/settings` : Récupération des paramètres
- `POST /api/settings` : Mise à jour des paramètres

## Sécurité

Toutes les routes sensibles sont protégées par un middleware d'authentification qui vérifie la validité du token JWT. Si l'utilisateur n'est pas authentifié, une erreur 401 est renvoyée ou l'utilisateur est redirigé vers la page de connexion.

Les mots de passe sont gérés par Firebase Authentication et ne sont jamais stockés en clair. Les tokens JWT sont stockés dans des cookies HTTP-only pour éviter les attaques XSS.

## Tests

Pour exécuter les tests :

```bash
npm test
```

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## Licence

Ce projet est sous licence ISC.

## Contact

Pour toute question ou suggestion : [contact@nykeau.fr](mailto:contact@nykeau.fr)
