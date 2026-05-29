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

    // Auth migration (safe to re-run)
    await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS email TEXT;`;
    await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS password_hash TEXT;`;
    await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;`;
    await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS players_email_uniq ON players (LOWER(email));`;
    await sql`ALTER TABLE players DROP CONSTRAINT IF EXISTS players_alias_key;`;
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

// ── Email + password helpers ─────────────────────────────────────
export function normalizeEmail(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (s.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

export function validatePassword(raw) {
  const s = String(raw || '');
  if (s.length < 8) return 'Password must be at least 8 characters.';
  if (s.length > 200) return 'Password is too long.';
  return null;
}

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(plain, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  if (expected.length === 0) return false;
  const actual = crypto.scryptSync(plain, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

export function generateTempPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = crypto.randomBytes(10);
  const out = [];
  for (let i = 0; i < 10; i++) out.push(alphabet[buf[i] % alphabet.length]);
  return out.join('');
}

// ── Session cookie (signed, HttpOnly) ────────────────────────────
export const SESSION_COOKIE = 'wc_sess';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days

function sessionSecret() {
  return process.env.AUTH_SECRET || process.env.ACCESS_CODE || 'wc2026-dev-fallback';
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

export function signSession(payload) {
  const body = { ...payload, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 };
  const data = b64url(JSON.stringify(body));
  const sig = b64url(crypto.createHmac('sha256', sessionSecret()).update(data).digest());
  return `${data}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const i = token.indexOf('.');
  if (i === -1) return null;
  const data = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = b64url(crypto.createHmac('sha256', sessionSecret()).update(data).digest());
  const a = Buffer.from(sig); const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  try { if (!crypto.timingSafeEqual(a, b)) return null; } catch { return null; }
  try {
    const body = JSON.parse(b64urlDecode(data).toString('utf8'));
    if (!body || typeof body !== 'object') return null;
    if (body.exp && body.exp < Date.now()) return null;
    return body;
  } catch { return null; }
}

export function setSessionCookie(res, payload) {
  const token = signSession(payload);
  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; '));
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; '));
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

export function getSessionUser(req) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  return verifySessionToken(token);
}

// Use at the top of any handler that needs a logged-in user.
// Returns the user payload, or sends 401 and returns null.
export function requireUser(req, res) {
  const u = getSessionUser(req);
  if (!u) { res.status(401).json({ error: 'Not signed in' }); return null; }
  return u;
}

export function requireAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const provided =
    req.headers['x-admin-password'] ||
    (req.body && req.body.adminPassword);
  return provided && provided === expected;
}

// Legacy shared-access cookie name (kept exported for back-compat references)
export const ACCESS_COOKIE = 'wc_access';

export { sql };

