import { sql, initDb, requireUser, normalizeAlias, clearSessionCookie } from './_db.js';

export default async function handler(req, res) {
  try {
    await initDb();
    const u = requireUser(req, res);
    if (!u) return;

    if (req.method === 'GET') {
      const q = await sql`
        SELECT id, email, alias, picks, must_change_password
        FROM players WHERE id = ${u.userId} LIMIT 1;
      `;
      const row = q.rows[0];
      if (!row) { clearSessionCookie(res); return res.status(401).json({ error: 'Account not found.' }); }
      return res.status(200).json({
        email: row.email,
        displayName: row.alias,
        picks: row.picks || {},
        mustChangePassword: !!row.must_change_password,
      });
    }

    if (req.method === 'POST') {
      const alias = normalizeAlias(req.body?.alias);
      if (!alias) return res.status(400).json({ error: 'Display name is required (max 40 characters, no @ symbol).' });
      const existing = await sql`SELECT id FROM players WHERE LOWER(alias) = LOWER(${alias}) AND id != ${u.userId} LIMIT 1;`;
      if (existing.rowCount > 0) return res.status(409).json({ error: 'That display name is already taken.' });
      await sql`UPDATE players SET alias = ${alias}, updated_at = NOW() WHERE id = ${u.userId};`;
      return res.status(200).json({ ok: true, alias });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('me error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
