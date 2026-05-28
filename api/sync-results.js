import { sql, initDb, requireAdmin } from './_db.js';

const SPORTS_DB_URL = 'https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=4429&s=2026';

// Official FIFA WC 2026 draw — used as fallback if DB hasn't been seeded.
const OFFICIAL_GROUPS = {
  A: ['MEX','RSA','KOR','CZE'],
  B: ['CAN','BIH','SUI','QAT'],
  C: ['HAI','SCO','BRA','MAR'],
  D: ['USA','PAR','AUS','TUR'],
  E: ['CIV','ECU','GER','CUW'],
  F: ['NED','JPN','SWE','TUN'],
  G: ['IRN','NZL','BEL','EGY'],
  H: ['KSA','URU','ESP','CPV'],
  I: ['FRA','SEN','IRQ','NOR'],
  J: ['ARG','ALG','AUT','JOR'],
  K: ['POR','COD','UZB','COL'],
  L: ['GHA','PAN','ENG','CRO'],
};

// TheSportsDB team-name → our 3-letter code. Covers all 48 official FIFA WC 2026 teams.
const NAME_TO_CODE = {
  // Group A
  'Mexico':'MEX',
  'South Africa':'RSA',
  'Korea Republic':'KOR','South Korea':'KOR',
  'Czechia':'CZE','Czech Republic':'CZE',
  // Group B
  'Canada':'CAN',
  'Bosnia and Herzegovina':'BIH','Bosnia & Herzegovina':'BIH','Bosnia-Herzegovina':'BIH',
  'Switzerland':'SUI',
  'Qatar':'QAT',
  // Group C
  'Haiti':'HAI',
  'Scotland':'SCO',
  'Brazil':'BRA',
  'Morocco':'MAR',
  // Group D
  'USA':'USA','United States':'USA',
  'Paraguay':'PAR',
  'Australia':'AUS',
  'Türkiye':'TUR','Turkey':'TUR',
  // Group E
  "Côte d'Ivoire":'CIV','Ivory Coast':'CIV',
  'Ecuador':'ECU',
  'Germany':'GER',
  'Curaçao':'CUW','Curacao':'CUW',
  // Group F
  'Netherlands':'NED',
  'Japan':'JPN',
  'Sweden':'SWE',
  'Tunisia':'TUN',
  // Group G
  'IR Iran':'IRN','Iran':'IRN',
  'New Zealand':'NZL',
  'Belgium':'BEL',
  'Egypt':'EGY',
  // Group H
  'Saudi Arabia':'KSA',
  'Uruguay':'URU',
  'Spain':'ESP',
  'Cabo Verde':'CPV','Cape Verde':'CPV',
  // Group I
  'France':'FRA',
  'Senegal':'SEN',
  'Iraq':'IRQ',
  'Norway':'NOR',
  // Group J
  'Argentina':'ARG',
  'Algeria':'ALG',
  'Austria':'AUT',
  'Jordan':'JOR',
  // Group K
  'Portugal':'POR',
  'Congo DR':'COD','DR Congo':'COD','Democratic Republic of the Congo':'COD',
  'Uzbekistan':'UZB',
  'Colombia':'COL',
  // Group L
  'Ghana':'GHA',
  'Panama':'PAN',
  'England':'ENG',
  'Croatia':'CRO',
};

// Approximate stage detection by date (FIFA 2026 official window).
function stageFor(dateStr) {
  if (!dateStr) return null;
  if (dateStr <= '2026-06-27') return 'group';
  if (dateStr <= '2026-07-03') return 'r32';
  if (dateStr <= '2026-07-07') return 'r16';
  if (dateStr <= '2026-07-11') return 'qf';
  if (dateStr <= '2026-07-15') return 'sf';
  if (dateStr === '2026-07-18') return 'third';
  return 'final';
}

function isFinished(m) {
  const s = (m.strStatus || '').toLowerCase();
  if (s.includes('finish') || s.includes('ft') || s === 'aet' || s === 'pen') return true;
  return m.intHomeScore != null && m.intAwayScore != null && (s === '' || s === 'ns' ? false : true);
}

function winnerCodes(m) {
  const h = parseInt(m.intHomeScore, 10);
  const a = parseInt(m.intAwayScore, 10);
  const home = NAME_TO_CODE[m.strHomeTeam];
  const away = NAME_TO_CODE[m.strAwayTeam];
  if (Number.isNaN(h) || Number.isNaN(a)) return { home, away, winner: null, draw: false, h, a };
  if (h > a) return { home, away, winner: home, draw: false, h, a };
  if (a > h) return { home, away, winner: away, draw: false, h, a };
  const hp = parseInt(m.intHomeShootoutScore || '0', 10);
  const ap = parseInt(m.intAwayShootoutScore || '0', 10);
  if (hp > ap) return { home, away, winner: home, draw: false, h, a };
  if (ap > hp) return { home, away, winner: away, draw: false, h, a };
  return { home, away, winner: null, draw: true, h, a };
}

function computeGroupStandings(groups, finishedGroupMatches) {
  // groups: { A: ['MEX','JPN','BEL','JAM'], ... }
  // Returns { A: ['1st','2nd'], ... } only when all 6 group matches are recorded.
  const codeToGroup = {};
  for (const [L, codes] of Object.entries(groups)) {
    for (const c of codes) codeToGroup[c] = L;
  }
  const table = {}; // L -> code -> {pts,gd,gf,played}
  for (const L of Object.keys(groups)) {
    table[L] = {};
    for (const c of groups[L]) table[L][c] = { code: c, pts: 0, gd: 0, gf: 0, played: 0 };
  }
  for (const m of finishedGroupMatches) {
    const { home, away, h, a } = m;
    if (!home || !away) continue;
    const L = codeToGroup[home];
    if (!L || codeToGroup[away] !== L) continue;
    const th = table[L][home], ta = table[L][away];
    if (!th || !ta) continue;
    th.played++; ta.played++;
    th.gf += h; ta.gf += a;
    th.gd += (h - a); ta.gd += (a - h);
    if (h > a) th.pts += 3;
    else if (a > h) ta.pts += 3;
    else { th.pts += 1; ta.pts += 1; }
  }
  const out = {};
  for (const [L, byCode] of Object.entries(table)) {
    const rows = Object.values(byCode);
    const allPlayed = rows.every(r => r.played === 3);
    if (!allPlayed) continue;
    rows.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
    out[L] = [rows[0].code, rows[1].code];
  }
  return out;
}

export default async function handler(req, res) {
  const cronAuth = req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET || ''}` && !!process.env.CRON_SECRET;
  const isAdmin = requireAdmin(req);
  if (!isAdmin && !cronAuth) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await initDb();

    // Load current results
    const cur = await sql`SELECT data FROM results WHERE id = 1;`;
    const results = cur.rows[0]?.data || {};
    const merged = {
      group: results.group || {},
      r32: results.r32 || {},
      r16: results.r16 || {},
      qf: results.qf || {},
      sf: results.sf || {},
      final: results.final || null,
    };

    // Groups come from the client (admin button), then fall back to stored groups,
    // and finally to the official FIFA WC 2026 draw baked in here.
    const groups = (req.body && req.body.groups) || results.groups || OFFICIAL_GROUPS;

    const r = await fetch(SPORTS_DB_URL, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) return res.status(502).json({ error: `Upstream ${r.status}` });
    const data = await r.json();
    const events = Array.isArray(data.events) ? data.events : [];

    const unknown = new Set();
    const buckets = { group: [], r32: [], r16: [], qf: [], sf: [], third: [], final: [] };
    let finishedCount = 0;

    for (const m of events) {
      if (!isFinished(m)) continue;
      finishedCount++;
      const stage = stageFor(m.dateEvent);
      if (!stage) continue;
      const w = winnerCodes(m);
      if (!w.home) unknown.add(m.strHomeTeam);
      if (!w.away) unknown.add(m.strAwayTeam);
      buckets[stage].push(w);
    }

    // Group stage → standings
    const standings = computeGroupStandings(groups, buckets.group);
    for (const [L, pair] of Object.entries(standings)) merged.group[L] = pair;

    // Knockout rounds: scoring is set-based, so we just need the set of winners per round.
    const setRound = (round, winners) => {
      const obj = {};
      winners.filter(Boolean).forEach((w, i) => { obj[i] = w; });
      merged[round] = obj;
    };
    const koWinners = (arr) => arr.map(w => w.winner).filter(Boolean);
    if (buckets.r32.length) setRound('r32', koWinners(buckets.r32));
    if (buckets.r16.length) setRound('r16', koWinners(buckets.r16));
    if (buckets.qf.length)  setRound('qf',  koWinners(buckets.qf));
    if (buckets.sf.length)  setRound('sf',  koWinners(buckets.sf));
    if (buckets.final.length) {
      const f = buckets.final.find(w => w.winner);
      if (f) merged.final = f.winner;
    }

    // Persist (and remember groups so cron can run without client input later).
    const toStore = { ...merged, groups };
    await sql`
      UPDATE results
      SET data = ${JSON.stringify(toStore)}::jsonb, updated_at = NOW()
      WHERE id = 1;
    `;

    return res.status(200).json({
      ok: true,
      finished: finishedCount,
      groupsComplete: Object.keys(standings).length,
      knockoutCounts: {
        r32: buckets.r32.length, r16: buckets.r16.length,
        qf: buckets.qf.length,   sf: buckets.sf.length,
        final: buckets.final.length,
      },
      unknownTeams: [...unknown],
    });
  } catch (err) {
    console.error('sync-results error', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
