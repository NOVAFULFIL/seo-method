// Fetch poli : délai entre requêtes, respect de robots.txt, timeouts, mesure TTFB.
const robotsCache = new Map();
let lastRequest = 0;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createClient({ userAgent = 'SEOMethodBot/1.0', delayMs = 400, timeoutMs = 20000 } = {}) {
  async function throttle() {
    const wait = lastRequest + delayMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
  }

  async function get(url, { accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', redirect = 'follow' } = {}) {
    await throttle();
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': userAgent, accept, 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' },
        redirect,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const ttfb = Date.now() - t0;
      const body = await res.text();
      return {
        url,
        finalUrl: res.url || url,
        status: res.status,
        redirected: res.redirected,
        headers: Object.fromEntries(res.headers.entries()),
        body,
        ttfb,
        totalMs: Date.now() - t0,
        bytes: Buffer.byteLength(body),
      };
    } catch (e) {
      return { url, finalUrl: url, status: 0, error: e.message, headers: {}, body: '', ttfb: 0, totalMs: Date.now() - t0, bytes: 0 };
    }
  }

  /** Renvoie une fonction allowed(url) d'après robots.txt (groupes "*" et notre UA). */
  async function robots(origin) {
    if (robotsCache.has(origin)) return robotsCache.get(origin);
    const res = await get(`${origin}/robots.txt`, { accept: 'text/plain' });
    const parsed = parseRobots(res.status === 200 ? res.body : '', userAgent);
    robotsCache.set(origin, { ...parsed, raw: res.status === 200 ? res.body : null, status: res.status });
    return robotsCache.get(origin);
  }

  return { get, robots };
}

export function parseRobots(txt, ua = '*') {
  const lines = txt.split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);
  const groups = [];
  let cur = null;
  const sitemaps = [];
  for (const line of lines) {
    const [k, ...rest] = line.split(':');
    const key = k.trim().toLowerCase();
    const val = rest.join(':').trim();
    if (key === 'sitemap') { sitemaps.push(val); continue; }
    if (key === 'user-agent') {
      if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
    } else if (cur && (key === 'allow' || key === 'disallow')) {
      cur.rules.push({ allow: key === 'allow', path: val });
    }
  }
  const uaToken = ua.split('/')[0].toLowerCase();
  const group = groups.find((g) => g.agents.some((a) => a !== '*' && uaToken.includes(a))) || groups.find((g) => g.agents.includes('*'));
  const rules = group ? group.rules.filter((r) => r.path) : [];
  const toRe = (p) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
  const compiled = rules.map((r) => ({ ...r, re: toRe(r.path), len: r.path.length }));
  function allowed(url) {
    const u = new URL(url);
    const p = u.pathname + u.search;
    let best = null;
    for (const r of compiled) if (r.re.test(p) && (!best || r.len > best.len || (r.len === best.len && r.allow))) best = r;
    return !best || best.allow;
  }
  return { allowed, sitemaps, groups };
}
