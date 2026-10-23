import type { VercelRequest, VercelResponse } from '@vercel/node';
import { client, initDB } from './_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await initDB();

    const membersResult = await client.execute('SELECT * FROM members ORDER BY id');
    const totalResult = await client.execute('SELECT COUNT(*) as count FROM hangouts');
    const totalHangouts = Number((totalResult.rows[0] as Record<string, unknown>)['count'] ?? 0);

    const members = await Promise.all(
      membersResult.rows.map(async (m: unknown) => {
        const row = m as Record<string, unknown>;
        const attendedResult = await client.execute({
          sql: 'SELECT COUNT(*) as count FROM attendance WHERE person_name = ? AND present = 1',
          args: [row['name'] as string],
        });
        const attended = Number((attendedResult.rows[0] as Record<string, unknown>)['count'] ?? 0);
        return { ...row, attended, total: totalHangouts };
      })
    );

    return res.json({ totalHangouts, members });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
