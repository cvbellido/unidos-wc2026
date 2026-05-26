import { sql, initDb, normalizeAlias } from './_db.js';

function picksHaveContent(p) {
  if (!p || typeof p !== 'object') return false;
  const g = p.group || {}; if (Object.values(g).some(a => Array.isArray(a) && a.length)) return true;
  for (const k of ['r32','r16','qf','sf']) if (p[k] && Object.keys(p[k]).length) return true;
  if (p.final) return true;
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    await initDb();
    const alias = normalizeAlias(req.body?.alias);
    const picks = req.body?.picks;
    if (!alias) return res.status(400).json({ error: 'Invalid alias' });
    if (!picks || typeof picks !== 'object') return res.status(400).json({ error: 'Invalid picks' });

    const existing = await sql`SELECT alias, picks FROM players WHERE LOWER(alias) = LOWER(${alias}) LIMIT 1;`;
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Player not registered. Please register first.' });
    }
    if (picksHaveContent(existing.rows[0].picks)) {
      return res.status(409).json({ error: 'Your picks have already been submitted and cannot be changed.', locked: true });
    }

    const result = await sql`
      UPDATE players
      SET picks = ${JSON.stringify(picks)}::jsonb, updated_at = NOW()
      WHERE LOWER(alias) = LOWER(${alias})
      RETURNING alias;
    `;
    return res.status(200).json({ alias: result.rows[0].alias, ok: true, locked: true });
  } catch (err) {
    console.error('submit-picks error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
