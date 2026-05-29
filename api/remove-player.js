import { sql, initDb, requireAdmin, normalizeEmail, normalizeAlias } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    await initDb();
    if (!requireAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    if (req.body?.all === true) {
      const result = await sql`DELETE FROM players;`;
      return res.status(200).json({ ok: true, removed: result.rowCount ?? null });
    }
    const email = normalizeEmail(req.body?.email);
    if (email) {
      await sql`DELETE FROM players WHERE LOWER(email) = ${email};`;
      return res.status(200).json({ ok: true });
    }
    const alias = normalizeAlias(req.body?.alias);
    if (alias) {
      await sql`DELETE FROM players WHERE LOWER(alias) = LOWER(${alias});`;
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'email, alias, or all=true required' });
  } catch (err) {
    console.error('remove-player error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
