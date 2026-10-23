import type { VercelRequest, VercelResponse } from '@vercel/node';
import { IncomingForm, type Fields, type Files } from 'formidable';
import { getClient, initDB } from './_db';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await initDB();
    const db = getClient();

    if (req.method === 'GET') {
      const { year, month } = req.query as Record<string, string | undefined>;
      let query = db.from('hangouts').select('*');
      if (year && month) {
        const start = new Date(Number(year), Number(month) - 1, 1);
        const end = new Date(Number(year), Number(month), 1);
        const toDate = (value: Date) => value.toISOString().slice(0, 10);
        query = query.gte('date', toDate(start)).lt('date', toDate(end));
      }
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      const hangouts = await Promise.all((data ?? []).map((item) => withAttendance(item.id)));
      return res.json(hangouts);
    }

    if (req.method === 'POST') {
      const { fields } = await parseForm(req);
      const date = field(fields, 'date');
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
      const attendance = parseAttendance(field(fields, 'attendance'));
      const { data: hangout, error } = await db.from('hangouts').insert({
        date, label: field(fields, 'label') || null,
      }).select('id').single();
      if (error) throw error;
      if (attendance.length) {
        const { error: attendanceError } = await db.from('attendance').insert(
          attendance.map((item) => ({ hangout_id: hangout.id, person_name: item.person_name, present: item.present }))
        );
        if (attendanceError) throw attendanceError;
      }
      return res.status(201).json(await withAttendance(hangout.id));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
