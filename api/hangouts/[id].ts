import type { VercelRequest, VercelResponse } from '@vercel/node';
import { IncomingForm, type Fields, type Files } from 'formidable';
import { getClient, initDB } from '../_db';

export const config = { api: { bodyParser: false } };
type AttendanceInput = { person_name: string; present: boolean };

function parseForm(req: VercelRequest): Promise<{ fields: Fields; files: Files }> {
  return new Promise((resolve, reject) => {
    new IncomingForm({ maxFileSize: 10 * 1024 * 1024 }).parse(req as never, (error, fields, files) => {
      if (error) reject(error);
      else resolve({ fields, files });
    });
  });
}

function field(fields: Fields, key: string): string | undefined {
  const value = fields[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseAttendance(value?: string): AttendanceInput[] {
  if (!value) return [];
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error('attendance must be an array');
  return parsed.map((item) => {
    if (
      typeof item !== 'object' || item === null ||
      typeof (item as Record<string, unknown>).person_name !== 'string' ||
      typeof (item as Record<string, unknown>).present !== 'boolean'
    ) throw new Error('attendance contains an invalid record');
    return item as AttendanceInput;
  });
}

async function withAttendance(id: number) {
  const db = getClient();
  const [{ data: hangout, error: hangoutError }, { data: attendance, error: attendanceError }] =
    await Promise.all([
      db.from('hangouts').select('*').eq('id', id).single(),
      db.from('attendance').select('*').eq('hangout_id', id).order('id'),
    ]);
  if (hangoutError) throw hangoutError;
  if (attendanceError) throw attendanceError;
  return { ...hangout, attendance: attendance ?? [] };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const id = Number(req.query.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' });

  try {
    await initDB();
    const db = getClient();
    const { data: existing, error: existingError } = await db.from('hangouts').select('*').eq('id', id).maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    if (req.method === 'GET') return res.json(await withAttendance(id));

    if (req.method === 'PUT') {
      const { fields } = await parseForm(req);
      const attendance = parseAttendance(field(fields, 'attendance'));
      const { error } = await db.from('hangouts').update({
        label: field(fields, 'label') ?? existing.label,
      }).eq('id', id);
      if (error) throw error;

      for (const item of attendance) {
        const { error: attendanceError } = await db.from('attendance').upsert({
          hangout_id: id, person_name: item.person_name, present: item.present,
        }, { onConflict: 'hangout_id,person_name' });
        if (attendanceError) throw attendanceError;
      }
      return res.json(await withAttendance(id));
    }

    if (req.method === 'DELETE') {
      const { error } = await db.from('hangouts').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
