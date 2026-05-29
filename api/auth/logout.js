import { clearSessionCookie } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'POST or GET only' });
  }
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
