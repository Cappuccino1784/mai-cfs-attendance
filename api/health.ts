import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getClient } from './_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { error } = await getClient().from('members').select('id').limit(1);
    if (error) throw error;
    return res.status(200).json({ ok: true, database: 'supabase' });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Database connection failed',
    });
  }
}
