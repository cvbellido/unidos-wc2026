import {
  sql, initDb,
  normalizeEmail, validatePassword, hashPassword,
  normalizeAlias, normalizeFullName, setSessionCookie,
} from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    await initDb();
    const email = normalizeEmail(req.body?.email);
    const displayName = normalizeAlias(req.body?.displayName);
    const fullName = normalizeFullName(req.body?.fullName);
    const password = req.body?.password;

    if (!email) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!email.endsWith('@slalom.com')) {
      return res.status(400).json({ error: 'Please use your @slalom.com email address to sign up.' });
    }
    if (!fullName) return res.status(400).json({ error: 'Please enter your full name.' });
    if (!displayName) return res.status(400).json({ error: 'Please enter your display name.' });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const existing = await sql`SELECT id FROM players WHERE LOWER(email) = ${email} LIMIT 1;`;
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'An account with that email already exists. Try logging in instead.' });
    }

    const password_hash = hashPassword(password);
    const inserted = await sql`
      INSERT INTO players (alias, email, password_hash, full_name, picks, last_login_at)
      VALUES (${displayName}, ${email}, ${password_hash}, ${fullName}, '{}'::jsonb, NOW())
      RETURNING id, email, alias, full_name;
    `;
    const row = inserted.rows[0];
    setSessionCookie(res, { userId: row.id, email: row.email });
    return res.status(201).json({ ok: true, email: row.email, displayName: row.alias, fullName: row.full_name });
  } catch (err) {
    console.error('signup error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
