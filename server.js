require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'projects.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

// ---------- Ensure storage exists ----------
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

// ---------- Tiny JSON "database" (fine for a single-admin portfolio) ----------
let writeQueue = Promise.resolve();
function readProjects() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}
function writeProjects(data) {
  writeQueue = writeQueue.then(() =>
    fs.promises.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
  );
  return writeQueue;
}

// ---------- Core middleware ----------
app.use(express.json());
app.set('trust proxy', 1); // needed so secure cookies work behind a hosting platform's proxy

app.use(
  session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8, // 8h
    },
  })
);

app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Non autorisé.' });
}

// naive in-memory rate limit for the login route
const loginAttempts = new Map();
function isRateLimited(ip) {
  const rec = loginAttempts.get(ip) || { count: 0, first: Date.now() };
  if (Date.now() - rec.first > 5 * 60 * 1000) {
    rec.count = 0;
    rec.first = Date.now();
  }
  rec.count += 1;
  loginAttempts.set(ip, rec);
  return rec.count > 20;
}
function clearRateLimit(ip) {
  loginAttempts.delete(ip);
}

// ============ Auth ============
app.post('/api/admin/login', async (req, res) => {
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessaie dans quelques minutes.' });
  }

  const { password } = req.body || {};
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (!hash) {
    return res.status(500).json({ error: "Mot de passe admin non configuré (ADMIN_PASSWORD_HASH manquant dans .env)." });
  }
  if (!password) {
    return res.status(400).json({ error: 'Mot de passe requis.' });
  }

  const ok = await bcrypt.compare(password, hash);
  if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect.' });

  clearRateLimit(req.ip);
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/check', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// ============ Public read ============
app.get('/api/projects', (req, res) => {
  res.json(readProjects());
});

// ============ Upload config ============
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov'];
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 80 * 1024 * 1024 }, // 80MB, generous enough for short video clips
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return cb(new Error('Type de fichier non autorisé.'));
    cb(null, true);
  },
});

function filesToMedia(files) {
  return (files || []).map((f) => ({
    id: crypto.randomUUID(),
    type: f.mimetype.startsWith('video') ? 'video' : 'image',
    url: '/uploads/' + f.filename,
  }));
}

// ============ Public read: single project ============
app.get('/api/projects/:id', (req, res) => {
  const projects = readProjects();
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Introuvable.' });
  res.json(project);
});

// ============ Admin: CRUD projects ============
app.post('/api/admin/projects', requireAuth, upload.array('media', 20), async (req, res) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'Au moins un fichier requis.' });
    const { title, description, large } = req.body || {};

    const media = filesToMedia(req.files);
    const projects = readProjects();
    const project = {
      id: crypto.randomUUID(),
      title: (title || 'Sans titre').trim(),
      description: (description || '').trim(),
      media,
      // kept for compatibility with anything reading the old single-media shape
      type: media[0].type,
      url: media[0].url,
      large: large === 'true' || large === true,
      createdAt: new Date().toISOString(),
    };
    projects.push(project);
    await writeProjects(projects);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add more photos/videos to an existing project
app.post('/api/admin/projects/:id/media', requireAuth, upload.array('media', 20), async (req, res) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'Au moins un fichier requis.' });
    const projects = readProjects();
    const idx = projects.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Introuvable.' });

    const newMedia = filesToMedia(req.files);
    if (!Array.isArray(projects[idx].media)) {
      projects[idx].media = projects[idx].url ? [{ id: crypto.randomUUID(), type: projects[idx].type, url: projects[idx].url }] : [];
    }
    projects[idx].media = projects[idx].media.concat(newMedia);
    projects[idx].type = projects[idx].media[0].type;
    projects[idx].url = projects[idx].media[0].url;

    await writeProjects(projects);
    res.json(projects[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove a single photo/video from a project
app.delete('/api/admin/projects/:id/media/:mediaId', requireAuth, async (req, res) => {
  const projects = readProjects();
  const idx = projects.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Introuvable.' });

  const project = projects[idx];
  if (!Array.isArray(project.media)) return res.status(404).json({ error: 'Média introuvable.' });

  const mIdx = project.media.findIndex((m) => m.id === req.params.mediaId);
  if (mIdx === -1) return res.status(404).json({ error: 'Média introuvable.' });
  if (project.media.length === 1) {
    return res.status(400).json({ error: 'Un projet doit garder au moins un média. Supprime le projet entier si besoin.' });
  }

  const [removed] = project.media.splice(mIdx, 1);
  project.type = project.media[0].type;
  project.url = project.media[0].url;

  await writeProjects(projects);

  const filePath = path.join(__dirname, 'public', removed.url);
  fs.unlink(filePath, () => {});

  res.json(project);
});

app.put('/api/admin/projects/:id', requireAuth, async (req, res) => {
  const { title, description, large } = req.body || {};
  const projects = readProjects();
  const idx = projects.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Introuvable.' });

  if (title !== undefined) projects[idx].title = String(title).trim();
  if (description !== undefined) projects[idx].description = String(description).trim();
  if (large !== undefined) projects[idx].large = !!large;

  await writeProjects(projects);
  res.json(projects[idx]);
});

app.delete('/api/admin/projects/:id', requireAuth, async (req, res) => {
  const projects = readProjects();
  const idx = projects.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Introuvable.' });

  const [removed] = projects.splice(idx, 1);
  await writeProjects(projects);

  // best-effort cleanup of all uploaded files for this project
  const mediaList = Array.isArray(removed.media) ? removed.media : (removed.url ? [{ url: removed.url }] : []);
  mediaList.forEach((m) => {
    const filePath = path.join(__dirname, 'public', m.url);
    fs.unlink(filePath, () => {});
  });

  res.json({ ok: true });
});

app.put('/api/admin/projects-reorder', requireAuth, async (req, res) => {
  const { order } = req.body || {};
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order invalide.' });

  const projects = readProjects();
  const byId = new Map(projects.map((p) => [p.id, p]));
  const reordered = order.map((id) => byId.get(id)).filter(Boolean);
  projects.forEach((p) => {
    if (!order.includes(p.id)) reordered.push(p);
  });

  await writeProjects(reordered);
  res.json({ ok: true });
});

// multer / general error handler
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message });
  next();
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
