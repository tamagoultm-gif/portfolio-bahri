# Portfolio — Bahri Hammami (avec espace admin)

Site portfolio + petit serveur (Node.js/Express) qui permet d'ajouter des
images et vidéos de projets depuis une page admin protégée par mot de passe.
Les projets ajoutés sont visibles par **tous les visiteurs** du site (pas
seulement sur ton propre navigateur).

## Pourquoi un serveur, et pas juste des fichiers HTML ?

Un site 100% statique (HTML/CSS/JS seuls) ne peut pas se souvenir des fichiers
que tu uploades ni les montrer aux autres visiteurs — il n'y a nulle part où
les stocker. Ce projet ajoute donc un petit serveur qui :

- stocke les fichiers uploadés dans `public/uploads/`
- stocke les infos des projets (titre, description, ordre…) dans `data/projects.json`
- protège la page `/admin.html` avec un mot de passe (session sécurisée)

## 1. Installation (en local, sur ton ordinateur)

Il faut [Node.js](https://nodejs.org) installé (version 18 ou plus).

```bash
cd server
npm install
```

## 2. Configurer le mot de passe admin

```bash
node hash-password.js "TonMotDePasse"
```

Ça affiche une ligne du type :

```
ADMIN_PASSWORD_HASH=$2a$12$........................
```

Copie le fichier `.env.example` vers `.env`, puis colle ce hash dedans :

```bash
cp .env.example .env
```

Édite `.env` et remplis :
- `ADMIN_PASSWORD_HASH` → le hash généré ci-dessus
- `SESSION_SECRET` → une chaîne aléatoire (génère-en une avec
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

**Ne mets jamais `.env` sur GitHub** — il est déjà exclu via `.gitignore`.

## 3. Lancer le site en local

```bash
npm start
```

Ouvre :
- `http://localhost:3000` → le site public
- `http://localhost:3000/admin.html` → l'espace admin

## 4. Utiliser l'espace admin

- Va sur `/admin.html`, entre ton mot de passe
- Remplis le titre, une description (optionnel), choisis une image ou vidéo
- Coche "Format large" si tu veux que la case occupe 2 colonnes
- Clique "Publier" → le projet apparaît immédiatement sur `/projects.html`
  pour tous les visiteurs
- Tu peux réordonner (↑ / ↓), modifier le titre/description, ou supprimer
  un projet à tout moment

Tant qu'aucun projet n'a été ajouté, la page `/projects.html` affiche les
emplacements réservés d'origine — le site ne casse jamais.

## 5. Mettre le site en ligne

Comme le site stocke des fichiers uploadés sur le disque du serveur, il faut
un hébergeur avec **stockage persistant** (pas un hébergeur "statique" comme
GitHub Pages, Netlify ou Vercel, qui ne gardent pas les fichiers uploadés).

Options simples :
- **Render** (plan avec "Persistent Disk") ou **Railway** — faciles, gratuits
  pour commencer, supportent Node.js + disque persistant
- Un **VPS** (Hostinger, OVH, DigitalOcean…) si tu préfères tout gérer toi-même

Étapes générales (valables pour Render/Railway) :
1. Mets ce dossier `server/` dans un dépôt Git (GitHub)
2. Crée un nouveau service Web sur la plateforme, connecte le dépôt
3. Commande de build : `npm install` — Commande de démarrage : `npm start`
4. Ajoute les variables d'environnement (`SESSION_SECRET`,
   `ADMIN_PASSWORD_HASH`, `NODE_ENV=production`) dans les réglages de la
   plateforme (pas besoin d'uploader `.env`)
5. Active un disque persistant monté sur `public/uploads` et `data`, sinon
   les fichiers seront perdus à chaque redéploiement
6. Une fois en ligne, va sur `https://tondomaine.com/admin.html`

## Sécurité — ce qu'il faut savoir

- Un seul mot de passe admin protège tout : c'est suffisant pour un
  portfolio personnel, pas pour un site avec plusieurs utilisateurs
- `/admin.html` est exclu des moteurs de recherche (`robots.txt` +
  balise `noindex`), mais reste techniquement accessible si quelqu'un
  devine l'adresse — sans le mot de passe, il ne peut rien modifier
- Change le mot de passe régulièrement, et ne le partage avec personne
