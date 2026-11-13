const { readLead } = require('./_lib');
// Public: lets the person who placed an order see its status and Anwesha's reply. The id is a long random secret.
module.exports = async (req, res) => {
  const lead = await readLead(String(req.query.id || ''));
  if (!lead) return res.status(404).json({ error: 'Order not found.' });
  res.status(200).json({ ref: lead.id.slice(0, 6).toUpperCase(), role: lead.role, status: lead.status, reply: lead.reply || '', createdAt: lead.createdAt, updatedAt: lead.updatedAt });
};
