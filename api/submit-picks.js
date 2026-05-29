import { sql, initDb, requireUser } from './_db.js';

// Picks close at end of day June 10, 2026 ET (23:59:59 EDT = 03:59:59 UTC June 11).
const PICKS_DEADLINE_MS = Date.UTC(2026, 5, 11, 3, 59, 59);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    await initDb();
    const u = requireUser(req, res);
    if (!u) return;
    const picks = req.body?.picks;
    if (!picks || typeof picks !== 'object') return res.status(400).json({ error: 'Invalid picks' });

    if (Date.now() >= PICKS_DEADLINE_MS) {
      return res.status(409).json({ error: 'Picks closed on June 10, 2026 at 11:59 PM ET.', locked: true });
    }

    const result = await sql`
      UPDATE players
      SET picks = ${JSON.stringify(picks)}::jsonb, updated_at = NOW()
      WHERE id = ${u.userId}
      RETURNING alias, email;
    `;
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    const row = result.rows[0];
    return res.status(200).json({ ok: true, displayName: row.alias, email: row.email });
  } catch (err) {
    console.error('submit-picks error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
