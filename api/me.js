import { sql, initDb, requireUser, clearSessionCookie } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  try {
    await initDb();
    const u = requireUser(req, res);
    if (!u) return;
    const q = await sql`
      SELECT id, email, alias, picks, must_change_password
      FROM players
      WHERE id = ${u.userId}
      LIMIT 1;
    `;
    const row = q.rows[0];
    if (!row) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Account not found.' });
    }
    return res.status(200).json({
      email: row.email,
      displayName: row.alias,
      picks: row.picks || {},
      mustChangePassword: !!row.must_change_password,
    });
  } catch (err) {
    console.error('me error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
