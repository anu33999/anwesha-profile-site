const { SITE, OWNER, LABELS, sendMail, ID_RE, STATUSES, readLead, writeLead, listBlobs, removeLead, isAuthed, clean } = require('./_lib');
module.exports = async (req, res) => {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Sign in first.' });
  try {
    if (req.method === 'GET') {
      const blobs = await listBlobs();
      const ids = blobs.map((b) => (/leads\/([a-f0-9]{32})\.json$/.exec(b.pathname) || [])[1]).filter(Boolean);
      const leads = (await Promise.all(ids.map(readLead))).filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return res.status(200).json({ leads });
    }
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    if (!ID_RE.test(b.id || '')) return res.status(400).json({ error: 'Bad id.' });
    if (req.method === 'PATCH') {
      const lead = await readLead(b.id);
      if (!lead) return res.status(404).json({ error: 'Not found.' });
      if (STATUSES.includes(b.status)) lead.status = b.status;
      if (typeof b.reply === 'string') lead.reply = clean(b.reply, 2000);
      if (typeof b.notes === 'string') lead.notes = clean(b.notes, 4000);
      lead.updatedAt = new Date().toISOString();
      let email = null;
      if (b.sendEmail === true) {
        if (!lead.reply) email = { sent: false, reason: 'Write a reply first.' };
        else {
          email = await sendMail({
            to: lead.email,
            replyTo: OWNER,
            subject: `Re: your ${lead.role.toLowerCase()} request - Anwesha Mulge`,
            text: [
              `Hi ${lead.name},`, ``,
              lead.reply, ``,
              `Status: ${LABELS[lead.status] || 'Received'}`,
              `Your order page: ${SITE}/?order=${lead.id}#hire`, ``,
              `Anwesha Mulge`, `${SITE.replace(/^https?:\/\//, '')}`
            ].join('\n')
          });
          if (email.sent) { lead.emailedAt = lead.updatedAt; lead.emailError = ''; } else lead.emailError = email.reason;
        }
      }
      await writeLead(lead);
      return res.status(200).json({ lead, email });
    }
    if (req.method === 'DELETE') { await removeLead(b.id); return res.status(200).json({ ok: true }); }
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Something went wrong. Try again.' }); }
};
