const { writeLead, listBlobs, clean, crypto, sendMail, OWNER, SITE } = require('./_lib');
const ROLES = ['Full-time role', 'Internship', 'Freelance project'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  if (clean(b.website, 200)) return res.status(200).json({ ok: true, id: crypto.randomBytes(16).toString('hex') }); // bot trap
  const name = clean(b.name, 80), email = clean(b.email, 120), company = clean(b.company, 100), message = clean(b.message, 1500);
  const role = ROLES.includes(b.role) ? b.role : ROLES[0];
  if (name.length < 2) return res.status(400).json({ error: 'Please add your name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Please add a valid email so I can reach you.' });
  try {
    const blobs = await listBlobs(), hourAgo = Date.now() - 36e5;
    if (blobs.length >= 1000 || blobs.filter((x) => new Date(x.uploadedAt).getTime() > hourAgo).length >= 30)
      return res.status(429).json({ error: 'Too many requests right now. Please try again in a little while.' });
    const now = new Date().toISOString();
    const lead = { id: crypto.randomBytes(16).toString('hex'), createdAt: now, updatedAt: now, name, email, company, role, message, status: 'new', reply: '', notes: '' };
    await writeLead(lead);
    await sendMail({
      to: OWNER,
      replyTo: lead.email,
      subject: `New hire order: ${lead.role} from ${lead.name}`,
      text: [
        `New order on your site.`, ``,
        `Name:    ${lead.name}`, `Email:   ${lead.email}`, `Company: ${lead.company || '-'}`, `Role:    ${lead.role}`, ``,
        `Message:`, lead.message || '(none)', ``,
        `Reply from your Order Desk: ${SITE}/crm`,
        `Or just hit reply to email them directly.`
      ].join('\n')
    });
    return res.status(200).json({ ok: true, id: lead.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Could not save your request. Please try again.' });
  }
};
