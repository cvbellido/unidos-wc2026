// Vercel Edge Middleware: hard-gate /home.html (and /home) so unauthenticated
// users get a server-side 302 to /index.html before the page is ever served.
// The cookie value is HMAC-validated against ACCESS_CODE so a forged
// cookie can't bypass the gate.
import { next } from '@vercel/edge';

const COOKIE = 'wc_access';
const SIGNATURE_INPUT = 'wc2026-access-v1';

async function expectedToken(secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(SIGNATURE_INPUT));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
  const secret = process.env.ACCESS_CODE || '';
  const expected = secret ? await expectedToken(secret) : null;

  if (!provided || !expected || provided !== expected) {
    const url = new URL('/index.html', request.url);
    return Response.redirect(url, 302);
  }

  return next();
}

export const config = {
  matcher: ['/home.html', '/home'],
};
