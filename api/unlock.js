// Simple shared-password gate. Verifies against ADMIN_PASSWORD env var
// so we don't need a separate secret for now.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'Server password not configured' });

  const provided = req.body && req.body.password;
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  return res.status(200).json({ ok: true });
}
