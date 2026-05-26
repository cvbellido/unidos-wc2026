import { sql, initDb, normalizeAlias, aliasKey } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    await initDb();
    const alias = normalizeAlias(req.body?.alias);
    if (!alias) return res.status(400).json({ error: 'Invalid alias' });

    const key = aliasKey(alias);
    if (!key) return res.status(400).json({ error: 'Alias must contain letters or numbers' });

    const all = await sql`SELECT alias FROM players;`;
    const clash = all.rows.find(r => aliasKey(r.alias) === key);
    if (clash) {
      return res.status(409).json({
        error: `The alias "${alias}" is too similar to "${clash.alias}", which is already taken. Please pick a different alias.`,
        existing: clash.alias,
      });
    }

    const inserted = await sql`
      INSERT INTO players (alias, picks)
      VALUES (${alias}, '{}'::jsonb)
      RETURNING alias;
    `;
    return res.status(201).json({ alias: inserted.rows[0].alias });
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
