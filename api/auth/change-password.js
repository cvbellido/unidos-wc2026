import {
  sql, initDb,
  requireUser, validatePassword, verifyPassword, hashPassword, setSessionCookie,
} from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    await initDb();
    const u = requireUser(req, res);
    if (!u) return;

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    const pwErr = validatePassword(newPassword);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const q = await sql`SELECT id, email, password_hash FROM players WHERE id = ${u.userId} LIMIT 1;`;
    const row = q.rows[0];
    if (!row) return res.status(401).json({ error: 'Account not found.' });
    if (!verifyPassword(currentPassword, row.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const newHash = hashPassword(newPassword);
    await sql`
      UPDATE players
      SET password_hash = ${newHash}, must_change_password = FALSE, updated_at = NOW()
      WHERE id = ${row.id};
    `;
    // Refresh the session cookie (extends expiration)
    setSessionCookie(res, { userId: row.id, email: row.email });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('change-password error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
