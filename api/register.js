import { sql, initDb, normalizeAlias, aliasKey, denyIfLocked } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (denyIfLocked(req, res)) return;
  try {
    await initDb();
    const alias = normalizeAlias(req.body?.alias);
    if (!alias) return res.status(400).json({ error: 'Invalid alias' });

    const key = aliasKey(alias);
    if (!key) return res.status(400).json({ error: 'Name must contain letters or numbers' });

    const all = await sql`SELECT alias FROM players;`;
    const clash = all.rows.find(r => aliasKey(r.alias) === key);
    if (clash) {
      return res.status(409).json({
        error: `The name "${alias}" is too similar to "${clash.alias}", which is already taken. Please use a different name.`,
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
