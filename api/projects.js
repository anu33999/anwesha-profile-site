// Live project feed for the portfolio. Reads public GitHub repos, fills in
// title, description, stack and live link, and caches the result at the edge
// for an hour, so new or updated repos show up on the site on their own.
const USER = process.env.GITHUB_USER || 'anu33999';

// Hand-written copy for repos that deserve a better pitch than their README.
// Anything not listed here is still shown, described from its own README.
const CURATED = {
  'kreatif-ngo-platform': {
    title: 'NGO Intelligence and Outreach CRM', kind: 'WEB APP', file: 'ngo-crm.tsx',
    desc: 'A research and outreach platform built for Kreatif Atelier. It looks up an NGO from public sources, audits its website and social presence, and drafts outreach for a person to review. Nothing is sent automatically.',
    pts: ['Directory of 276 NGOs across Hyderabad and Secunderabad', '7-stage audit pipeline with a cited source for every finding', 'Outreach CRM, Leaflet map of who has been contacted, Excel and PDF exports'],
    live: 'https://ngo-crm-new.vercel.app'
  },
  'aurelius-radar': {
    title: 'Aurelius Radar', kind: 'WEB APP', file: 'aurelius-radar.tsx',
    desc: 'Client intelligence for Kreatif Atelier with two engines: a deep commercial audit of any brand\'s site, tracking, SEO and socials, and a social intent radar that finds founders publicly asking for agency, developer or growth help.',
    pts: ['Ranks revenue gaps and matches them to agency services', 'AI or rule-based classifier keeps only real buyers', 'Client CRM, pipeline and global map, with no seed or demo data']
  },
  'kreatif-growth-hq': {
    title: 'Kreatif Growth HQ', kind: 'WEB APP', file: 'growth-hq.tsx',
    desc: 'The agency\'s content, creative and client-growth operating system: plan, produce, publish and measure content for Instagram, LinkedIn, Facebook and YouTube, and run lead generation, all in one app.',
    pts: ['Works offline with data stored in the browser (IndexedDB)', 'Checklists and guided workflows for every post', 'No server and no API keys needed']
  },
  'anwesha-profile-site': {
    title: 'This portfolio + private hire CRM', kind: 'WEB APP', file: 'portfolio.js',
    desc: 'The site you are on. Vanilla JS and Vercel serverless functions, with a hire form that saves requests to private storage, a password-protected order desk where I reply, and a project list that syncs itself from GitHub.',
    pts: ['Hire orders stored in private Vercel Blob storage, with signed-cookie login for the CRM', 'Projects, stack and live links read from GitHub and cached for an hour', 'Working terminal, live chart, position size calculator and a photo that turns into binary'],
    live: 'https://anweshamulge.com'
  },
  'pipes': {
    title: 'Mahanandi Pipes', kind: 'CLIENT', file: 'mahanandi-pipes.jsx',
    desc: 'Company website for a pipe manufacturer: product catalogue, service coverage, company history and contact pages.',
    pts: ['Whole site switches language through a React context and a translation file', 'Built and shipped as a client project'],
    live: 'https://www.mahanandipipes.com'
  },
  'helping-hand-foundation-website': { title: 'Helping Hand Foundation', kind: 'CONCEPT', file: 'hhf-site.tsx', live: 'https://hhfdemoupdated.vercel.app' },
  'conare-site': { title: 'CONARE', kind: 'CONCEPT', file: 'conare-site.tsx' },
  'fake-news-bert': {
    title: 'Fake News Classifier (BERT)', kind: 'ML', file: 'fake_news_bert.py',
    desc: 'Fine-tuned bert-base-uncased to tell fake from real political statements in the LIAR dataset (12.8k PolitiFact claims), and compared it with a majority-class baseline and TF-IDF + logistic regression.',
    pts: ['65.9% test accuracy and 0.649 macro-F1, against 56.7% for the majority-class baseline', 'Class-weighted loss, linear warm-up, gradient clipping, best checkpoint chosen on validation macro-F1', 'Confusion matrix, ROC and per-label accuracy in a written report'],
    stack: ['Python', 'PyTorch', 'Hugging Face Transformers', 'scikit-learn', 'pandas'],
    live: null // fake-news-bert.vercel.app belongs to someone else
  },
  'dl-exam-prep': { title: 'Deep Learning Exam Prep', kind: 'STUDY', file: 'dl-exam-prep', desc: 'An exam-prep site for my Deep Learning course, with a syllabus checklist that tracks progress and lecture content with figures.', live: null },
  'helping-hands-website': { title: 'Helping Hands Humanity', kind: 'CONCEPT', file: 'hhh-site.tsx' },
  'agape-india-website': { title: 'Agape India', kind: 'CONCEPT', file: 'agape-site.tsx' },
  'crwds-website': { title: 'CRWDS', kind: 'CONCEPT', file: 'crwds-site.tsx' },
  'donbosco-south-asia': { title: 'Don Bosco South Asia', kind: 'CONCEPT', file: 'donbosco.html' }
};
// Older copies of a project that has a newer repo above, and non-project repos (linkedin-visuals is post images).
const HIDE = new Set(['ngo-crm-new', 'ngo-crm', 'ashraya-crm', 'HHFdemoupdated', 'HHF-demo', 'mahanandipipes-main', 'mahanandipipes', 'conare-website', 'aurelius-crm', 'linkedin-visuals', USER]);
const ORDER = Object.keys(CURATED);

const STACK_HINTS = [
  ['next', 'Next.js'], ['react', 'React'], ['vite', 'Vite'], ['typescript', 'TypeScript'], ['tailwindcss', 'Tailwind CSS'],
  ['@prisma/client', 'Prisma'], ['prisma', 'Prisma'], ['react-leaflet', 'Leaflet'], ['dexie', 'IndexedDB'], ['react-router-dom', 'React Router'],
  ['express', 'Express'], ['framer-motion', 'Framer Motion']
];

function withTimeout(ms) { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; }
async function text(url, ms = 4000) {
  try { const r = await fetch(url, { signal: withTimeout(ms) }); return r.ok ? await r.text() : ''; } catch (e) { return ''; }
}
function cleanMd(s) {
  return s.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`>#]/g, '').replace(/\s+/g, ' ').trim();
}
function fromReadme(md) {
  if (!md) return {};
  const h1 = (/^#\s+(.+)$/m.exec(md) || [])[1];
  const paras = md.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !/^(#|```|\||- |\* |\d+\.|<)/.test(p));
  let desc = paras.length ? cleanMd(paras[0]) : '';
  desc = desc.split(/(?<=\.)\s+/).filter((x) => !/^(React|Built with|Run |npm )/.test(x)).join(' ');
  if (desc.length > 300) desc = desc.slice(0, 297).replace(/\s+\S*$/, '') + '…';
  return { title: h1 ? cleanMd(h1).split(/\s+[—–-]\s+/)[0] : '', desc };
}
function fromHtml(html) {
  const t = (/<title>([^<]*)<\/title>/i.exec(html) || [])[1] || '';
  const d = (/<meta\s+name="description"\s+content="([^"]*)"/i.exec(html) || [])[1] || '';
  return { title: t.split(/\s+[—–|·-]\s+/)[0].trim(), desc: d.trim() };
}
function stackFrom(pkg, lang) {
  const out = [];
  try {
    const p = JSON.parse(pkg); const deps = Object.assign({}, p.dependencies, p.devDependencies);
    for (const [k, label] of STACK_HINTS) if (deps[k] && !out.includes(label)) out.push(label);
  } catch (e) {}
  if (!out.length && lang) out.push(lang);
  if (lang === 'TypeScript' && !out.includes('TypeScript')) out.push('TypeScript');
  return out.slice(0, 6);
}
async function vercelLive(name) {
  const url = `https://${name.toLowerCase()}.vercel.app`;
  try { const r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: withTimeout(2500) }); return r.ok ? url : ''; } catch (e) { return ''; }
}

async function build() {
  const headers = { 'User-Agent': 'portfolio-sync', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
  const r = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`, { headers, signal: withTimeout(6000) });
  if (!r.ok) throw new Error('GitHub ' + r.status);
  const repos = (await r.json()).filter((x) => !x.fork && !x.archived && !HIDE.has(x.name));
  const items = await Promise.all(repos.map(async (repo) => {
    const raw = `https://raw.githubusercontent.com/${USER}/${repo.name}/HEAD/`;
    const cur = CURATED[repo.name] || {};
    const [md, pkg] = await Promise.all([text(raw + 'README.md'), text(raw + 'package.json')]);
    let auto = fromReadme(md);
    if (!auto.desc) auto = Object.assign({}, fromHtml(await text(raw + 'index.html')), auto.title ? { title: auto.title } : {});
    const concept = /design concept|demo redesign/i.test(md);
    // live: null in CURATED means "no live site": skip the name-guess, which can hit another person's deployment.
    const live = 'live' in cur ? cur.live : (repo.homepage || (await vercelLive(repo.name)));
    const links = [];
    if (live) links.push(['Live site ↗', live]);
    links.push(['Code ↗', repo.html_url]);
    return {
      repo: repo.name,
      file: cur.file || repo.name,
      path: 'projects/' + (cur.file || repo.name),
      title: cur.title || auto.title || repo.name.replace(/[-_]/g, ' '),
      kind: cur.kind || (concept ? 'CONCEPT' : 'PROJECT'),
      desc: cur.desc || repo.description || auto.desc || 'Project on GitHub.',
      pts: cur.pts || (concept ? ['Design concept prepared by Kreatif Atelier to pitch to the organisation'] : []),
      stack: cur.stack || stackFrom(pkg, repo.language),
      links,
      updated: repo.pushed_at
    };
  }));
  items.sort((a, b) => {
    const ia = ORDER.indexOf(a.repo), ib = ORDER.indexOf(b.repo);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.updated < b.updated ? 1 : -1;
  });
  return { user: USER, publicRepos: null, projects: items, generatedAt: new Date().toISOString() };
}

module.exports = async (req, res) => {
  try {
    const data = await build();
    const u = await fetch(`https://api.github.com/users/${USER}`, { headers: { 'User-Agent': 'portfolio-sync' }, signal: withTimeout(4000) }).then((x) => (x.ok ? x.json() : {})).catch(() => ({}));
    data.publicRepos = u.public_repos || null;
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(data);
  } catch (e) {
    console.error(e);
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.status(502).json({ error: 'Could not reach GitHub right now.' });
  }
};
