import { sql, initDb, normalizeAlias } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    await initDb();
    const alias = normalizeAlias(req.body?.alias);
    const picks = req.body?.picks;
    if (!alias) return res.status(400).json({ error: 'Invalid alias' });
    if (!picks || typeof picks !== 'object') return res.status(400).json({ error: 'Invalid picks' });

    const result = await sql`
      UPDATE players
      SET picks = ${JSON.stringify(picks)}::jsonb, updated_at = NOW()
      WHERE LOWER(alias) = LOWER(${alias})
      RETURNING alias;
    `;
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Player not registered. Please register first.' });
    }
    return res.status(200).json({ alias: result.rows[0].alias, ok: true });
  } catch (err) {
    console.error('submit-picks error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
