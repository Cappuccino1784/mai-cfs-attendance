import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { mkdirSync, existsSync, unlinkSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

// Ensure uploads folder exists
const UPLOADS_DIR = join(__dirname, 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json());

// Serve uploaded photos statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer storage — keep original extension, name by date+random
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Initialize SQLite DB
const db = new Database(join(__dirname, 'attendance.db'));
db.pragma('foreign_keys = ON');

// Create / migrate tables
db.exec(`
  CREATE TABLE IF NOT EXISTS hangouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    label TEXT,
    photo_path TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hangout_id INTEGER NOT NULL,
    person_name TEXT NOT NULL,
    present INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (hangout_id) REFERENCES hangouts(id) ON DELETE CASCADE,
    UNIQUE(hangout_id, person_name)
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '🌸'
  );
`);

// Add photo_path column if upgrading from older DB (safe no-op if exists)
try {
  db.exec(`ALTER TABLE hangouts ADD COLUMN photo_path TEXT`);
} catch (_) { /* column already exists */ }

// Seed default members if empty
const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get();
if (memberCount.count === 0) {
  const defaultMembers = [
    { name: 'Anh Minh',  color: '#f9a8d4', emoji: '🌸' },
    { name: 'Nhat Mai',  color: '#c4b5fd', emoji: '🌷' },
    { name: 'Bao Ngoc',  color: '#fca5a5', emoji: '🍑' },
    { name: 'Minh Ngoc', color: '#86efac', emoji: '🌿' },
    { name: 'Hong Chau', color: '#fdba74', emoji: '🧡' },
  ];
  const insert = db.prepare('INSERT INTO members (name, color, emoji) VALUES (?, ?, ?)');
  for (const m of defaultMembers) insert.run(m.name, m.color, m.emoji);
}

// ── helpers ───────────────────────────────────────────────────────────────────
function withAttendance(hangout) {
  if (!hangout) return null;
  const attendance = db.prepare('SELECT * FROM attendance WHERE hangout_id = ?').all(hangout.id);
  return { ...hangout, attendance };
}

function deletePhoto(photoPath) {
  if (!photoPath) return;
  const file = join(UPLOADS_DIR, photoPath.replace(/^\/uploads\//, ''));
  try { unlinkSync(file); } catch (_) {}
}

// ── GET /api/members ──────────────────────────────────────────────────────────
app.get('/api/members', (_req, res) => {
  res.json(db.prepare('SELECT * FROM members ORDER BY id').all());
});

// ── GET /api/hangouts ─────────────────────────────────────────────────────────
app.get('/api/hangouts', (req, res) => {
  const { year, month } = req.query;
  let query = 'SELECT * FROM hangouts';
  const params = [];
  if (year && month) {
    query += ` WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`;
    params.push(String(year), String(month).padStart(2, '0'));
  }
  query += ' ORDER BY date ASC';
  const hangouts = db.prepare(query).all(...params);
  res.json(hangouts.map(withAttendance));
});

// ── GET /api/hangouts/:id ─────────────────────────────────────────────────────
app.get('/api/hangouts/:id', (req, res) => {
  const hangout = db.prepare('SELECT * FROM hangouts WHERE id = ?').get(req.params.id);
  if (!hangout) return res.status(404).json({ error: 'Not found' });
  res.json(withAttendance(hangout));
});

// ── POST /api/hangouts ────────────────────────────────────────────────────────
// Body is multipart/form-data: date, label, attendance (JSON string), photo (file)
app.post('/api/hangouts', upload.single('photo'), (req, res) => {
  const { date, label } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });

  const existing = db.prepare('SELECT id FROM hangouts WHERE date = ?').get(date);
  if (existing) return res.status(409).json({ error: 'A hangout already exists on this date' });

  const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db
    .prepare('INSERT INTO hangouts (date, label, photo_path) VALUES (?, ?, ?)')
    .run(date, label || null, photoPath);
  const hangoutId = result.lastInsertRowid;

  // Insert attendance
  let attendance = [];
  try { attendance = JSON.parse(req.body.attendance || '[]'); } catch (_) {}
  const insertAtt = db.prepare(
    'INSERT INTO attendance (hangout_id, person_name, present) VALUES (?, ?, ?)'
  );
  for (const a of attendance) insertAtt.run(hangoutId, a.person_name, a.present ? 1 : 0);

  res.status(201).json(withAttendance(db.prepare('SELECT * FROM hangouts WHERE id = ?').get(hangoutId)));
});

// ── PUT /api/hangouts/:id ─────────────────────────────────────────────────────
// Also accepts multipart if a new photo is being uploaded
app.put('/api/hangouts/:id', upload.single('photo'), (req, res) => {
  const hangout = db.prepare('SELECT * FROM hangouts WHERE id = ?').get(req.params.id);
  if (!hangout) return res.status(404).json({ error: 'Not found' });

  const { label, removePhoto } = req.body;

  let photoPath = hangout.photo_path;

  if (req.file) {
    // New photo uploaded — delete old one
    deletePhoto(hangout.photo_path);
    photoPath = `/uploads/${req.file.filename}`;
  } else if (removePhoto === 'true') {
    // Explicit removal
    deletePhoto(hangout.photo_path);
    photoPath = null;
  }

  db.prepare('UPDATE hangouts SET label = ?, photo_path = ? WHERE id = ?').run(
    label !== undefined ? (label || null) : hangout.label,
    photoPath,
    hangout.id
  );

  // Update attendance if provided
  let attendance = [];
  try { attendance = JSON.parse(req.body.attendance || '[]'); } catch (_) {}
  if (attendance.length > 0) {
    const upsert = db.prepare(`
      INSERT INTO attendance (hangout_id, person_name, present)
      VALUES (?, ?, ?)
      ON CONFLICT(hangout_id, person_name) DO UPDATE SET present = excluded.present
    `);
    for (const a of attendance) upsert.run(hangout.id, a.person_name, a.present ? 1 : 0);
  }

  res.json(withAttendance(db.prepare('SELECT * FROM hangouts WHERE id = ?').get(hangout.id)));
});

// ── DELETE /api/hangouts/:id ──────────────────────────────────────────────────
app.delete('/api/hangouts/:id', (req, res) => {
  const hangout = db.prepare('SELECT * FROM hangouts WHERE id = ?').get(req.params.id);
  if (!hangout) return res.status(404).json({ error: 'Not found' });
  deletePhoto(hangout.photo_path);
  db.prepare('DELETE FROM attendance WHERE hangout_id = ?').run(hangout.id);
  db.prepare('DELETE FROM hangouts WHERE id = ?').run(hangout.id);
  res.json({ success: true });
});

// ── GET /api/stats ────────────────────────────────────────────────────────────
app.get('/api/stats', (_req, res) => {
  const members = db.prepare('SELECT * FROM members ORDER BY id').all();
  const totalHangouts = db.prepare('SELECT COUNT(*) as count FROM hangouts').get().count;
  const stats = members.map(m => {
    const attended = db.prepare(
      'SELECT COUNT(*) as count FROM attendance WHERE person_name = ? AND present = 1'
    ).get(m.name).count;
    return { ...m, attended, total: totalHangouts };
  });
  res.json({ totalHangouts, members: stats });
});

app.listen(PORT, () => {
  console.log(`🌸 Attendance server running on http://localhost:${PORT}`);
});
