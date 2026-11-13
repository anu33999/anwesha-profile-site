const { safeEq, makeCookie, isAuthed } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method === 'GET') return res.status(200).json({ authed: isAuthed(req) });
  if (req.method === 'DELETE') { res.setHeader('Set-Cookie', 'crm=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'); return res.status(200).json({ ok: true }); }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const pw = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  if (!process.env.CRM_PASSWORD || !process.env.CRM_SECRET) return res.status(500).json({ error: 'CRM is not configured.' });
  if (!pw || !safeEq(pw, process.env.CRM_PASSWORD)) { await new Promise((r) => setTimeout(r, 700)); return res.status(401).json({ error: 'Wrong password.' }); }
  res.setHeader('Set-Cookie', makeCookie());
  res.status(200).json({ ok: true });
};
