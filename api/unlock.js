// Simple shared-password gate. Verifies against ADMIN_PASSWORD env var
// and sets an HttpOnly access cookie that gates every other player API.
import { setAccessCookie } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'Server password not configured' });

  const provided = req.body && req.body.password;
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  setAccessCookie(res);
  return res.status(200).json({ ok: true });
}
