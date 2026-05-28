import { sql, initDb, normalizeAlias } from './_db.js';

// Picks close at end of day June 10, 2026 ET (23:59:59 EDT = 03:59:59 UTC June 11).
const PICKS_DEADLINE_MS = Date.UTC(2026, 5, 11, 3, 59, 59);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    await initDb();
    const alias = normalizeAlias(req.body?.alias);
    const picks = req.body?.picks;
    if (!alias) return res.status(400).json({ error: 'Invalid alias' });
    if (!picks || typeof picks !== 'object') return res.status(400).json({ error: 'Invalid picks' });

    if (Date.now() >= PICKS_DEADLINE_MS) {
      return res.status(409).json({ error: 'Picks closed on June 10, 2026 at 11:59 PM ET.', locked: true });
    }

    const existing = await sql`SELECT alias FROM players WHERE LOWER(alias) = LOWER(${alias}) LIMIT 1;`;
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Player not registered. Please register first.' });
    }

    const result = await sql`
      UPDATE players
      SET picks = ${JSON.stringify(picks)}::jsonb, updated_at = NOW()
      WHERE LOWER(alias) = LOWER(${alias})
      RETURNING alias;
    `;
    return res.status(200).json({ alias: result.rows[0].alias, ok: true });
  } catch (err) {
    console.error('submit-picks error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
