import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getClient, initDB } from './_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await initDB();
    const client = getClient();

    const { data: members, error: membersError } = await client.from('members').select('*').order('id');
    const { count: totalHangouts, error: hangoutsError } = await client
      .from('hangouts')
      .select('id', { count: 'exact', head: true });
    if (membersError) throw membersError;
    if (hangoutsError) throw hangoutsError;

    const memberStats = await Promise.all(
      (members ?? []).map(async (row) => {
        const { count: attended, error } = await client
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('person_name', row.name)
          .eq('present', true);
        if (error) throw error;
        return { ...row, attended: attended ?? 0, total: totalHangouts ?? 0 };
      })
    );

    return res.json({ totalHangouts: totalHangouts ?? 0, members: memberStats });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
