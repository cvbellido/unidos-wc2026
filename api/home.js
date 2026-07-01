// Serves the main app HTML, but only after validating the user session cookie.
// Without a valid session, returns 302 to /index.html.
import fs from 'node:fs';
import path from 'node:path';
import { getSessionUser } from './_db.js';

let cachedHtml = null;
function loadHtml() {
  if (cachedHtml) return cachedHtml;
  const filePath = path.join(process.cwd(), 'home.html');
  cachedHtml = fs.readFileSync(filePath, 'utf8');
  return cachedHtml;
}

export default async function handler(req, res) {
  const user = getSessionUser(req);
  if (!user) {
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
