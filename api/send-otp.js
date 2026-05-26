const { createHmac } = require('crypto');

function generateOtp(email) {
  const win = Math.floor(Date.now() / (10 * 60 * 1000));
  const hash = createHmac('sha256', process.env.OTP_SECRET)
    .update(`${email.toLowerCase().trim()}:${win}`)
    .digest('hex');
  return String(parseInt(hash.slice(0, 8), 16) % 1000000).padStart(6, '0');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, name } = req.body || {};

  if (!email || !/^[^\s@]+@slalom\.com$/i.test(email.trim())) {
    return res.status(400).json({ error: 'A valid @slalom.com email is required.' });
  }

  const code = generateOtp(email);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [email.trim()],
        subject: 'Your Unidos WC 2026 access code',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">
            <img src="https://raw.githubusercontent.com/cvbellido/unidos-wc2026/main/assets/wc-identity.svg"
                 alt="FIFA World Cup 2026" style="height:64px;margin-bottom:1.5rem" />
            <h2 style="color:#0030B6;margin-bottom:0.5rem">Unidos Bracket Challenge</h2>
            <p style="color:#333">Hi ${name ? name.split(' ')[0] : 'there'},</p>
            <p style="color:#333">Your one-time access code is:</p>
            <div style="font-size:2.5rem;font-weight:800;letter-spacing:0.3em;color:#0030B6;
                        padding:1rem 1.5rem;background:#f0f4ff;border-radius:12px;
                        display:inline-block;margin:0.5rem 0">${code}</div>
            <p style="color:#666;font-size:0.85rem;margin-top:1rem">
              This code expires in 10 minutes.<br/>
              If you didn't request this, you can ignore this email.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send email. Please try again.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
};
