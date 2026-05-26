import { sql, initDb, requireAdmin, normalizeAlias } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    await initDb();
    if (!requireAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    const alias = normalizeAlias(req.body?.alias);
    if (!alias) return res.status(400).json({ error: 'Invalid alias' });
    await sql`DELETE FROM players WHERE LOWER(alias) = LOWER(${alias});`;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('remove-player error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
