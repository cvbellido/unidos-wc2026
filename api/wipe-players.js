import { sql, initDb, requireAdmin } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    await initDb();
    if (!requireAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    const result = await sql`DELETE FROM players;`;
    return res.status(200).json({ ok: true, removed: result.rowCount ?? null });
  } catch (err) {
    console.error('wipe-players error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
