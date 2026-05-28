import { sql, initDb, requireAdmin, denyIfLocked } from './_db.js';

export default async function handler(req, res) {
  if (denyIfLocked(req, res)) return;
  try {
    await initDb();
    if (req.method === 'GET') {
      const q = await sql`SELECT data FROM results WHERE id = 1;`;
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(q.rows[0]?.data || {});
    }
    if (req.method === 'POST') {
      if (!requireAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      const data = req.body?.results;
      if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Invalid results' });
      await sql`
        UPDATE results
        SET data = ${JSON.stringify(data)}::jsonb, updated_at = NOW()
        WHERE id = 1;
      `;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('results error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
