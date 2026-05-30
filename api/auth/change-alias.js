import { sql, initDb, requireUser, normalizeAlias } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    await initDb();
    const u = requireUser(req, res);
    if (!u) return;

    const alias = normalizeAlias(req.body?.alias);
    if (!alias) return res.status(400).json({ error: 'Display name is required (max 40 characters, no @ symbol).' });

    const existing = await sql`SELECT id FROM players WHERE LOWER(alias) = LOWER(${alias}) AND id != ${u.userId} LIMIT 1;`;
    if (existing.rowCount > 0) return res.status(409).json({ error: 'That display name is already taken.' });

    await sql`UPDATE players SET alias = ${alias}, updated_at = NOW() WHERE id = ${u.userId};`;
    return res.status(200).json({ ok: true, alias });
  } catch (err) {
    console.error('change-alias error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
