import { sql, initDb, requireUser } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  try {
    await initDb();
    const u = requireUser(req, res);
    if (!u) return;
    const [playersQ, resultsQ] = await Promise.all([
      sql`SELECT alias, email, picks FROM players ORDER BY registered_at ASC;`,
      sql`SELECT data FROM results WHERE id = 1;`,
    ]);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      players: playersQ.rows.map(r => ({
        alias: r.alias || r.email,
        email: r.email,
        picks: r.picks || {},
      })),
      results: resultsQ.rows[0]?.data || {},
    });
  } catch (err) {
    console.error('leaderboard error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
