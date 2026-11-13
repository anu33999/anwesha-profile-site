const { put, list, get, del } = require('@vercel/blob');
const crypto = require('crypto');


const SITE = process.env.SITE_URL || 'https://anweshamulge.com';
const OWNER = process.env.NOTIFY_EMAIL || 'anweshamulge2@gmail.com';
const LABELS = { new: 'Received', talking: 'In talks', accepted: 'Accepted', declined: 'Declined' };

// Sends a plain-text email through Resend. Never throws: returns { sent, reason }.
async function sendMail({ to, subject, text, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'Email is not set up yet (no Resend API key).' };
  const from = process.env.MAIL_FROM || 'Anwesha Mulge <onboarding@resend.dev>';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, reply_to: replyTo || undefined })
    });
    if (r.ok) return { sent: true };
    const body = await r.text();
    console.error('resend', r.status, body);
    let msg = ''; try { msg = JSON.parse(body).message || ''; } catch (e) {}
    return { sent: false, reason: 'Email provider refused it' + (msg ? ': ' + msg : ' (' + r.status + ').') };
  } catch (e) { console.error('resend', e); return { sent: false, reason: 'Could not reach the email provider.' }; }
}

const ID_RE = /^[a-f0-9]{32}$/;
const STATUSES = ['new', 'talking', 'accepted', 'declined'];
const pathFor = (id) => `leads/${id}.json`;

async function readLead(id) {
  if (!ID_RE.test(id || '')) return null;
  try {
    const r = await get(pathFor(id), { access: 'private', useCache: false });
    if (!r || !r.stream) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch (e) { return null; }
}
async function writeLead(lead) {
  await put(pathFor(lead.id), JSON.stringify(lead), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
}
async function listBlobs() {
  const out = []; let cursor;
  do { const r = await list({ prefix: 'leads/', cursor, limit: 1000 }); out.push(...r.blobs); cursor = r.hasMore ? r.cursor : undefined; } while (cursor);
  return out;
}
async function removeLead(id) { if (ID_RE.test(id || '')) await del(pathFor(id)); }

function sign(exp) { return crypto.createHmac('sha256', process.env.CRM_SECRET || '').update(String(exp)).digest('hex'); }
function safeEq(a, b) { const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest(); return crypto.timingSafeEqual(x, y); }
function makeCookie() { const exp = Date.now() + 7 * 864e5; return `crm=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 86400}`; }
function isAuthed(req) {
  if (!process.env.CRM_SECRET) return false;
  const m = /(?:^|;\s*)crm=(\d+)\.([a-f0-9]{64})/.exec(req.headers.cookie || '');
  return !!m && Number(m[1]) > Date.now() && safeEq(m[2], sign(m[1]));
}
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);

module.exports = { SITE, OWNER, LABELS, sendMail, ID_RE, STATUSES, readLead, writeLead, listBlobs, removeLead, safeEq, makeCookie, isAuthed, clean, crypto };
