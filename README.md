# AutoApply

> Outil de suivi de candidatures — middleware Node.js + extension Chrome

## Prérequis

- Node.js 18+ (`node --version`)
- npm (`npm --version`)
- Un projet Firebase (voir section Firebase ci-dessous)
- PostgreSQL (pour la gestion des utilisateurs)

---

## 1. Cloner et installer les dépendances

```bash
cd middleware-rh
npm install
```

---

## 2. Installer et configurer PostgreSQL

```bash
# Installer PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Démarrer le service
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Créer la base de données
sudo -u postgres psql -c "CREATE DATABASE autoapply;"
sudo -u postgres psql -c "CREATE USER autoapply_user WITH PASSWORD 'autoapply_pass';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE autoapply TO autoapply_user;"
```

---

## 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Édite le fichier `.env` avec tes vraies valeurs :

```env
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# Base de données (correspond à ce qu'on a créé à l'étape 2)
DATABASE_URL="postgresql://autoapply_user:autoapply_pass@localhost:5432/autoapply"

# Firebase (récupère ces valeurs dans la console Firebase > Paramètres du projet)
FIREBASE_PROJECT_ID="ton-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@ton-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL="https://ton-project-id-default-rtdb.firebaseio.com"

# JWT (génère un secret aléatoire)
JWT_SECRET="un-secret-tres-long-et-aleatoire-ici"
JWT_EXPIRES_IN="7d"
SESSION_SECRET="un-autre-secret-session-long"

# Notion (optionnel)
NOTION_TOKEN=""
NOTION_DATABASE_ID=""
```

---

## 4. Récupérer les credentials Firebase

1. Va sur [console.firebase.google.com](https://console.firebase.google.com)
2. Selectionne ton projet Firebase
3. Paramètres (roue dentée) → **Comptes de service**
4. Clique sur **Générer une nouvelle clé privée**
5. Ouvre le JSON téléchargé et copie les valeurs dans ton `.env` :
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (garde les `\n` dans la valeur)

---

## 5. Lancer les migrations Prisma

```bash
npx prisma migrate deploy
```

> Si c'est la première installation, utilise plutôt :
> ```bash
> npx prisma migrate dev --name init
> ```

---

## 6. Démarrer le serveur

```bash
# Développement (avec rechargement automatique)
npm run dev

# Production
npm start
```

Le serveur tourne sur **http://localhost:3000**

---

## 7. Installer l'extension Chrome

1. Ouvre Chrome → `chrome://extensions/`
2. Active le **mode développeur** (toggle en haut à droite)
3. Clique **Charger l'extension non empaquetée**
4. Sélectionne le dossier `extension-rh/`

### Configurer le token dans l'extension

1. Lance le serveur (`npm run dev`)
2. Va sur http://localhost:3000 → connecte-toi
3. Dans le dashboard, clique **"Copier le token"** (carte "Token Extension")
4. Clique sur l'icône de l'extension AutoApply dans Chrome
5. Colle le token dans le champ prévu → **Enregistrer le token**
6. C'est prêt ! Le bouton "📩 Envoyer au middleware" apparaît sur LinkedIn et Indeed

---

## 8. Vérifier que tout fonctionne

```bash
# Santé du serveur
curl http://localhost:3000/health

# L'API doit répondre
curl http://localhost:3000/api/health
```

---

## Variables d'environnement optionnelles

| Variable | Description |
|----------|-------------|
| `NOTION_TOKEN` | Token API Notion (pour la sync) |
| `NOTION_DATABASE_ID` | ID de ta base Notion |
| `PERPLEXITY_API_KEY` | Clé API pour le chatbot IA |
| `SSL_KEY_PATH` | Chemin vers la clé SSL (HTTPS) |
| `SSL_CERT_PATH` | Chemin vers le certificat SSL |

---

## Dépannage

**"ECONNREFUSED" au démarrage** → PostgreSQL n'est pas lancé :
```bash
sudo systemctl start postgresql
```

**"Firebase: Error" au démarrage** → Vérifie `FIREBASE_PRIVATE_KEY` dans `.env` (les `\n` doivent être présents)

**Extension ne trouve pas le serveur** → Vérifie que le serveur tourne sur le bon port, et que le port dans le popup de l'extension correspond

**"Token invalide ou expiré"** → Reconnecte-toi sur le dashboard et recopie le token dans l'extension
