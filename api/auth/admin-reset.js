import {
  sql, initDb,
  requireAdmin, normalizeEmail, generateTempPassword, hashPassword,
} from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!requireAdmin(req)) return res.status(401).json({ error: 'Admin password required.' });
  try {
    await initDb();
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: 'Valid email required.' });

    const q = await sql`SELECT id, email, alias FROM players WHERE LOWER(email) = ${email} LIMIT 1;`;
    const row = q.rows[0];
    if (!row) return res.status(404).json({ error: 'No account with that email.' });

    const temp = generateTempPassword();
    const hash = hashPassword(temp);
    await sql`
      UPDATE players
      SET password_hash = ${hash}, must_change_password = TRUE, updated_at = NOW()
      WHERE id = ${row.id};
    `;
    return res.status(200).json({
      ok: true,
      email: row.email,
      displayName: row.alias,
      tempPassword: temp,
    });
  } catch (err) {
    console.error('admin-reset error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
