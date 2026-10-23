import type { VercelRequest, VercelResponse } from '@vercel/node';
import { IncomingForm, Fields, Files } from 'formidable';
import { readFileSync } from 'fs';
import { put, del } from '@vercel/blob';
import { client, initDB } from '../_db';

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
  if (!Array.isArray(parsed)) throw new Error('attendance must be an array');
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
  const [hangoutRes, attRes] = await Promise.all([
    client.execute({ sql: 'SELECT * FROM hangouts WHERE id = ?', args: [hangoutId] }),
    client.execute({ sql: 'SELECT * FROM attendance WHERE hangout_id = ?', args: [hangoutId] }),
  ]);
  return { ...(hangoutRes.rows[0] as Row), attendance: attRes.rows as Row[] };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const id = Number(req.query['id']);
  if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  // ── GET /api/hangouts/:id ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      await initDB();
      const hangoutRes = await client.execute({
        sql: 'SELECT * FROM hangouts WHERE id = ?',
        args: [id],
      });
      if (hangoutRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(await withAttendance(id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }

  // ── PUT /api/hangouts/:id ──────────────────────────────────────────────────
  if (req.method === 'PUT') {
    try {
      await initDB();
      const hangoutRes = await client.execute({
        sql: 'SELECT * FROM hangouts WHERE id = ?',
        args: [id],
      });
      if (hangoutRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      const hangout = hangoutRes.rows[0] as Row;

      const { fields, files } = await parseForm(req);
      const label = firstField(fields, 'label');
      const removePhoto = firstField(fields, 'removePhoto') === 'true';
      let attendance: { person_name: string; present: boolean }[];
      try {
        attendance = parseAttendance(firstField(fields, 'attendance'));
      } catch (err) {
        return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid attendance' });
      }

      let photoUrl = hangout['photo_url'] as string | null;

      const photoFile = Array.isArray(files['photo']) ? files['photo'][0] : files['photo'];
      if (photoFile && photoFile.filepath) {
        if (!photoFile.mimetype?.startsWith('image/')) {
          return res.status(400).json({ error: 'photo must be an image' });
        }
        if (photoUrl) {
          await del(photoUrl);
        }
        const buffer = readFileSync(photoFile.filepath);
        const filename = `hangouts/${hangout['date']}-${Date.now()}${
          photoFile.originalFilename ? `-${photoFile.originalFilename}` : '.jpg'
        }`;
        const blob = await put(filename, buffer, { access: 'public' });
        photoUrl = blob.url;
      } else if (removePhoto) {
        if (photoUrl) {
          await del(photoUrl);
        }
        photoUrl = null;
      }

      await client.execute({
        sql: 'UPDATE hangouts SET label = ?, photo_url = ? WHERE id = ?',
        args: [
          label !== undefined ? (label || null) : (hangout['label'] as string | null),
          photoUrl,
          id,
        ],
      });

      // Upsert attendance if provided
      for (const a of attendance) {
        await client.execute({
          sql: `INSERT INTO attendance (hangout_id, person_name, present)
                VALUES (?, ?, ?)
                ON CONFLICT(hangout_id, person_name) DO UPDATE SET present = excluded.present`,
          args: [id, a.person_name, a.present ? 1 : 0],
        });
      }

      return res.json(await withAttendance(id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }

  // ── DELETE /api/hangouts/:id ───────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      await initDB();
      const hangoutRes = await client.execute({
        sql: 'SELECT * FROM hangouts WHERE id = ?',
        args: [id],
      });
      if (hangoutRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      const hangout = hangoutRes.rows[0] as Row;

      const photoUrl = hangout['photo_url'] as string | null;
      if (photoUrl) {
        await del(photoUrl);
      }

      await client.batch([
        { sql: 'DELETE FROM attendance WHERE hangout_id = ?', args: [id] },
        { sql: 'DELETE FROM hangouts WHERE id = ?', args: [id] },
      ], 'write');

      return res.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
