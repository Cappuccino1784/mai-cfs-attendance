import type { VercelRequest, VercelResponse } from '@vercel/node';
import { IncomingForm, Fields, Files } from 'formidable';
import { readFileSync } from 'fs';
import { put } from '@vercel/blob';
import { getClient, initDB } from './_db';

// Disable Vercel's body parser so formidable can parse multipart
export const config = { api: { bodyParser: false } };

type Row = Record<string, unknown>;

async function parseForm(req: VercelRequest): Promise<{ fields: Fields; files: Files }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ maxFileSize: 10 * 1024 * 1024 });
    form.parse(req as Parameters<typeof form.parse>[0], (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function firstField(fields: Fields, key: string): string | undefined {
  const v = fields[key];
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

function parseAttendance(value: string | undefined): { person_name: string; present: boolean }[] {
  if (!value) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('attendance must be valid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('attendance must be an array');
  }

  return parsed.map((entry) => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      typeof (entry as Record<string, unknown>).person_name !== 'string' ||
      typeof (entry as Record<string, unknown>).present !== 'boolean'
    ) {
      throw new Error('attendance contains an invalid record');
    }
    return entry as { person_name: string; present: boolean };
  });
}

async function withAttendance(hangoutId: number): Promise<Row & { attendance: Row[] }> {
  const client = getClient();
  const [hangoutRes, attRes] = await Promise.all([
    client.execute({ sql: 'SELECT * FROM hangouts WHERE id = ?', args: [hangoutId] }),
    client.execute({ sql: 'SELECT * FROM attendance WHERE hangout_id = ?', args: [hangoutId] }),
  ]);
  return { ...(hangoutRes.rows[0] as Row), attendance: attRes.rows as Row[] };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── GET /api/hangouts ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      await initDB();
      const client = getClient();
      const { year, month } = req.query as Record<string, string | undefined>;

      let sql = 'SELECT * FROM hangouts';
      const args: (string | number)[] = [];

      if (year && month) {
        const paddedMonth = month.padStart(2, '0');
        sql += ' WHERE date LIKE ?';
        args.push(`${year}-${paddedMonth}-%`);
      }
      sql += ' ORDER BY date DESC';

      const hangoutsResult = await client.execute({ sql, args });
      const hangouts = await Promise.all(
        (hangoutsResult.rows as Row[]).map(async (h) => {
          const attRes = await client.execute({
            sql: 'SELECT * FROM attendance WHERE hangout_id = ?',
            args: [h['id'] as number],
          });
          return { ...h, attendance: attRes.rows };
        })
      );

      return res.json(hangouts);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }

  // ── POST /api/hangouts ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      await initDB();
      const client = getClient();
      const { fields, files } = await parseForm(req);

      const date = firstField(fields, 'date');
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
      }

      const label = firstField(fields, 'label') ?? null;
      let attendance: { person_name: string; present: boolean }[];
      try {
        attendance = parseAttendance(firstField(fields, 'attendance'));
      } catch (err) {
        return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid attendance' });
      }

      // Check for duplicate date
      const existing = await client.execute({
        sql: 'SELECT id FROM hangouts WHERE date = ?',
        args: [date],
      });
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'A hangout already exists on this date' });
      }

      // Handle photo upload
      let photoUrl: string | null = null;
      const photoFile = Array.isArray(files['photo']) ? files['photo'][0] : files['photo'];
      if (photoFile && photoFile.filepath) {
        if (!photoFile.mimetype?.startsWith('image/')) {
          return res.status(400).json({ error: 'photo must be an image' });
        }
        const buffer = readFileSync(photoFile.filepath);
        const filename = `hangouts/${date}-${Date.now()}${
          photoFile.originalFilename ? `-${photoFile.originalFilename}` : '.jpg'
        }`;
        const blob = await put(filename, buffer, { access: 'public' });
        photoUrl = blob.url;
      }

      // Insert hangout
      const insertResult = await client.execute({
        sql: 'INSERT INTO hangouts (date, label, photo_url) VALUES (?, ?, ?)',
        args: [date, label, photoUrl],
      });
      const hangoutId = Number(insertResult.lastInsertRowid);

      // Insert attendance records
      await client.batch(
        attendance.map((a) => ({
          sql: 'INSERT INTO attendance (hangout_id, person_name, present) VALUES (?, ?, ?)',
          args: [hangoutId, a.person_name, a.present ? 1 : 0],
        })),
        'write'
      );

      return res.status(201).json(await withAttendance(hangoutId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
