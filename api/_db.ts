import { createClient } from '@libsql/client';

const tursoUrl = process.env.TURSO_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl) {
  throw new Error('TURSO_URL is not configured');
}

export const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

const DEFAULT_MEMBERS = [
  { name: 'Anh Minh',  color: '#f9a8d4', emoji: '🌸' },
  { name: 'Nhat Mai',  color: '#c4b5fd', emoji: '🌷' },
  { name: 'Bao Ngoc',  color: '#fca5a5', emoji: '🍑' },
  { name: 'Minh Ngoc', color: '#86efac', emoji: '🌿' },
  { name: 'Hong Chau', color: '#fdba74', emoji: '🧡' },
];

let initialization: Promise<void> | undefined;

export function initDB(): Promise<void> {
  initialization ??= initializeDB();
  return initialization;
}

async function initializeDB(): Promise<void> {
  await client.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS hangouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        label TEXT,
        photo_url TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hangout_id INTEGER NOT NULL,
        person_name TEXT NOT NULL,
        present INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (hangout_id) REFERENCES hangouts(id) ON DELETE CASCADE,
        UNIQUE(hangout_id, person_name)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        emoji TEXT NOT NULL DEFAULT '🌸'
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_attendance_person_present ON attendance(person_name, present)',
      args: [],
    },
  ], 'write');

  const result = await client.execute('SELECT COUNT(*) as count FROM members');
  const count = Number((result.rows[0] as Record<string, unknown>)['count'] ?? 0);

  if (count === 0) {
    await client.batch(
      DEFAULT_MEMBERS.map((member) => ({
        sql: 'INSERT OR IGNORE INTO members (name, color, emoji) VALUES (?, ?, ?)',
        args: [member.name, member.color, member.emoji],
      })),
      'write'
    );
  }
}
