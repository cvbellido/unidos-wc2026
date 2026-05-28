import { sql } from '@vercel/postgres';
import crypto from 'crypto';

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

// ── Site-wide access cookie ────────────────────────────────────────
// Signed HttpOnly cookie that proves the user typed the access code
// on /index.html. All player APIs require this cookie.
export const ACCESS_COOKIE = 'wc_access';
const ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days

export function accessToken() {
  // Sign with ACCESS_CODE so changing the user code rotates all cookies,
  // without affecting the separate ADMIN_PASSWORD.
  const secret = process.env.ACCESS_CODE || '';
  return crypto.createHmac('sha256', secret).update('wc2026-access-v1').digest('hex');
}

export function setAccessCookie(res) {
  const token = accessToken();
  const parts = [
    `${ACCESS_COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${ACCESS_MAX_AGE_SECONDS}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}

export function hasAccess(req) {
  const cookie = readCookie(req, ACCESS_COOKIE);
  if (!cookie) return false;
  return cookie === accessToken();
}

// Use at the top of any handler that requires the access cookie.
// Returns true if the request was rejected (handler should `return`).
export function denyIfLocked(req, res) {
  if (hasAccess(req) || requireAdmin(req)) return false;
  res.status(401).json({ error: 'Locked' });
  return true;
}

export { sql };
