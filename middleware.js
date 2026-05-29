// Vercel Edge Middleware: hard-gate /home.html (and /home) so unauthenticated
// users get a server-side 302 to /index.html before the page is ever served.
// Validates the wc_sess cookie signature against AUTH_SECRET.
import { next } from '@vercel/edge';

const COOKIE = 'wc_sess';

function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  if (typeof atob === 'function') {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(0);
}

function b64urlEncode(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return new Uint8Array(sig);
}

async function verifySession(token, secret) {
  if (!token || !secret) return false;
  const i = token.indexOf('.');
  if (i === -1) return false;
  const data = token.slice(0, i);
  const providedSig = token.slice(i + 1);
  const expectedSig = b64urlEncode(await hmacSha256(secret, data));
  if (providedSig.length !== expectedSig.length) return false;
  // Constant-time-ish compare
  let diff = 0;
  for (let k = 0; k < providedSig.length; k++) {
    diff |= providedSig.charCodeAt(k) ^ expectedSig.charCodeAt(k);
  }
  if (diff !== 0) return false;
  try {
    const bytes = b64urlDecode(data);
    const json = new TextDecoder().decode(bytes);
    const body = JSON.parse(json);
    if (body && body.exp && body.exp < Date.now()) return false;
    return true;
  } catch { return false; }
}

function readCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}

export default async function middleware(request) {
  const provided = readCookie(request.headers.get('cookie'), COOKIE);
  const secret = process.env.AUTH_SECRET || process.env.ACCESS_CODE || '';
  const ok = await verifySession(provided, secret);
  if (!ok) {
    const url = new URL('/index.html', request.url);
    return Response.redirect(url, 302);
  }
  return next();
}

export const config = {
  matcher: ['/home.html', '/home'],
};
