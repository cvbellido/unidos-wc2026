import { sql } from '@vercel/postgres';

let initPromise = null;

export async function initDb() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS players (
        id            SERIAL PRIMARY KEY,
        alias         TEXT UNIQUE NOT NULL,
        picks         JSONB NOT NULL DEFAULT '{}'::jsonb,
        registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS results (
        id         INT PRIMARY KEY DEFAULT 1,
        data       JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (id = 1)
      );
    `;
    await sql`INSERT INTO results (id, data) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING;`;
  })();
  return initPromise;
}

export function normalizeAlias(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (s.length > 40) return null;
  if (s.includes('@')) return null;
  return s;
}

export function aliasKey(alias) {
  return String(alias || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function requireAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const provided =
    req.headers['x-admin-password'] ||
    (req.body && req.body.adminPassword);
  return provided && provided === expected;
}

export { sql };
