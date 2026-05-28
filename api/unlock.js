// Shared-password gate for end users. Verifies against ACCESS_CODE env var
// (separate from ADMIN_PASSWORD) and sets an HttpOnly access cookie that
// gates every other player API.
import { setAccessCookie } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.ACCESS_CODE;
  if (!expected) return res.status(500).json({ error: 'Server access code not configured' });

  const provided = req.body && req.body.password;
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Incorrect access code' });
  }

  setAccessCookie(res);
  return res.status(200).json({ ok: true });
}
