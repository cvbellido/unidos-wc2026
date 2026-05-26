const { createHmac } = require('crypto');

function generateOtp(email, windowOffset = 0) {
  const win = Math.floor(Date.now() / (10 * 60 * 1000)) + windowOffset;
  const hash = createHmac('sha256', process.env.OTP_SECRET)
    .update(`${email.toLowerCase().trim()}:${win}`)
    .digest('hex');
  return String(parseInt(hash.slice(0, 8), 16) % 1000000).padStart(6, '0');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, code } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ error: 'Missing fields.' });
  }

  // Accept current window and previous window (handles edge case at boundary)
  const valid = [0, -1].some(
    offset => generateOtp(email, offset) === String(code).trim()
  );

  return res.status(200).json({ valid });
};
