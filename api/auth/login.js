import {
  sql, initDb,
  normalizeEmail, verifyPassword, setSessionCookie,
} from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    await initDb();
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const q = await sql`
      SELECT id, email, alias, password_hash, must_change_password
      FROM players
      WHERE LOWER(email) = ${email}
      LIMIT 1;
    `;
    const row = q.rows[0];
    if (!row || !row.password_hash) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    if (!verifyPassword(password, row.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    await sql`UPDATE players SET last_login_at = NOW() WHERE id = ${row.id};`;
    setSessionCookie(res, { userId: row.id, email: row.email });
    return res.status(200).json({
      ok: true,
      email: row.email,
      displayName: row.alias,
      mustChangePassword: !!row.must_change_password,
    });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
