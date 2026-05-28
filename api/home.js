// Serves the main app HTML, but only after validating the access cookie.
// Without a valid cookie, returns 302 to /index.html.
import fs from 'node:fs';
import path from 'node:path';
import { accessToken, ACCESS_COOKIE } from './_db.js';

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}

let cachedHtml = null;
function loadHtml() {
  if (cachedHtml) return cachedHtml;
  const filePath = path.join(process.cwd(), 'app.html');
  cachedHtml = fs.readFileSync(filePath, 'utf8');
  return cachedHtml;
}

export default async function handler(req, res) {
  const provided = readCookie(req, ACCESS_COOKIE);
  const expected = accessToken();
  if (!provided || provided !== expected) {
    res.statusCode = 302;
    res.setHeader('Location', '/index.html');
    res.end();
    return;
  }

  try {
    const html = loadHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html);
  } catch (e) {
    console.error('home serve error', e);
    res.status(500).json({ error: 'Failed to load page' });
  }
}
