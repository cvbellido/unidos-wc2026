import {
  sql, initDb,
  normalizeEmail, validatePassword, hashPassword,
  normalizeAlias, setSessionCookie,
} from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    await initDb();
    const email = normalizeEmail(req.body?.email);
    const displayName = normalizeAlias(req.body?.displayName);
    const password = req.body?.password;
    if (!email) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!displayName) return res.status(400).json({ error: 'Please enter your display name.' });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const existing = await sql`SELECT id FROM players WHERE LOWER(email) = ${email} LIMIT 1;`;
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'An account with that email already exists. Try logging in instead.' });
    }

    const password_hash = hashPassword(password);
    // The alias column is still NOT NULL — keep it populated with the display name
    // (no longer required to be unique after the auth migration).
    const inserted = await sql`
      INSERT INTO players (alias, email, password_hash, picks, last_login_at)
      VALUES (${displayName}, ${email}, ${password_hash}, '{}'::jsonb, NOW())
      RETURNING id, email, alias;
    `;
    const row = inserted.rows[0];
    setSessionCookie(res, { userId: row.id, email: row.email });
    return res.status(201).json({ ok: true, email: row.email, displayName: row.alias });
  } catch (err) {
    console.error('signup error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
