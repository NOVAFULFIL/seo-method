#!/usr/bin/env node
// ÉTAPE 3 — Aspire la documentation Google Search Central (version anglaise, la plus à jour)
// et la convertit en Markdown dans knowledge/google-search-docs/.
// Usage : npm run google-docs [-- --blog-since 2025 --max 600]
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { ROOT, arg, writeJSON } from '../lib/config.js';
import { createClient } from '../lib/http.js';

const BASE = 'https://developers.google.com';
const OUT = path.join(ROOT, 'knowledge', 'google-search-docs');
const blogSince = Number(arg('blog-since', new Date().getFullYear() - 1));
const MAX = Number(arg('max', 800));

const SEEDS = ['/search/docs', '/search/docs/fundamentals/creating-helpful-content', '/search/docs/appearance/ai-features',
  '/search/docs/essentials/spam-policies', '/search/updates/ranking', '/search/updates/core-updates', '/search/blog'];

function inScope(p) {
  if (/^\/search\/docs(\/|$)/.test(p)) return true;
  if (/^\/search\/updates(\/|$)/.test(p)) return true;
  if (p === '/search/blog') return true;
  const m = p.match(/^\/search\/blog\/(\d{4})(\/|$)/);
  return !!m && Number(m[1]) >= blogSince;
}

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
td.use(gfm);
td.remove(['script', 'style', 'devsite-feedback', 'devsite-thumb-rating', 'button']);

const client = createClient({ userAgent: 'SEOMethodDocsSync/1.0', delayMs: 350 });
const robots = await client.robots(BASE);
const queue = [...SEEDS];
const seen = new Set(queue);
const manifest = [];
const redirects = [];
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

console.log(`▶ Synchronisation Google Search Central (blog depuis ${blogSince})`);
while (queue.length && manifest.length < MAX) {
  const p = queue.shift();
  const url = `${BASE}${p}?hl=en`;
  if (!robots.allowed(url)) continue;
  const res = await client.get(url);
  process.stdout.write(`\r  ${manifest.length + 1} ${res.status} ${p.slice(0, 90).padEnd(90)}`);
  if (res.status !== 200) continue;
  // Page retirée par Google → redirection (souvent vers le journal des mises à jour) : on la note sans la dupliquer.
  const finalPath = new URL(res.finalUrl).pathname.replace(/\/$/, '');
  if (finalPath !== p) { redirects.push({ from: p, to: finalPath }); if (inScope(finalPath) && !seen.has(finalPath)) { seen.add(finalPath); queue.push(finalPath); } continue; }
  const $ = cheerio.load(res.body);

  $('a[href]').each((_, el) => {
    try {
      const u = new URL($(el).attr('href'), BASE);
      if (u.origin !== BASE) return;
      const np = u.pathname.replace(/\/$/, '');
      if (inScope(np) && !seen.has(np)) { seen.add(np); queue.push(np); }
    } catch {}
  });

  const body = $('.devsite-article-body').first();
  if (!body.length) continue;
  body.find('devsite-code, pre').each((_, el) => { $(el).find('.devsite-code-buttons-container').remove(); });
  body.find('a[href]').each((_, el) => { try { const u = new URL($(el).attr('href'), `${BASE}${p}`); u.searchParams.delete('hl'); $(el).attr('href', u.toString()); } catch {} });
  const title = $('h1.devsite-page-title').first().text().trim() || $('title').text().split('|')[0].trim();
  const updated = ($.text().match(/Last updated (\d{4}-\d{2}-\d{2}) UTC/) || [])[1] || '';
  const md = td.turndown(body.html() || '').replace(/\n{3,}/g, '\n\n').trim();
  const rel = (p.replace(/^\/search\//, '') || 'index') + '.md';
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `---\ntitle: ${JSON.stringify(title)}\nsource: ${BASE}${p}\nlast_updated: ${updated}\nfetched: ${new Date().toISOString().slice(0, 10)}\n---\n\n# ${title}\n\n${md}\n`);
  manifest.push({ title, path: rel, source: `${BASE}${p}`, lastUpdated: updated, words: md.split(/\s+/).length });
}
process.stdout.write('\n');

manifest.sort((a, b) => a.path.localeCompare(b.path));
writeJSON(path.join(OUT, 'manifest.json'), { fetchedAt: new Date().toISOString(), count: manifest.length, pages: manifest, removedOrRedirected: redirects });

const groups = {};
for (const m of manifest) { const g = m.path.split('/').slice(0, 2).join('/').replace(/\.md$/, ''); (groups[g] ||= []).push(m); }
const recent = [...manifest].filter((m) => m.lastUpdated).sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)).slice(0, 30);
const index = [
  '# Google Search Central — base de connaissance locale', '',
  `Synchronisée le **${new Date().toISOString().slice(0, 10)}** · ${manifest.length} pages · source : developers.google.com/search (version EN).`, '',
  'Relancer `npm run google-docs` pour mettre à jour. Synthèse actionnable : [`../seo-playbook.md`](../seo-playbook.md).', '',
  '## Pages modifiées le plus récemment', '', ...recent.map((m) => `- ${m.lastUpdated} — [${m.title}](${m.path})`), '',
  ...(redirects.length ? ['## Pages retirées ou redirigées par Google', '', ...redirects.map((r) => `- ${r.from} → ${r.to}`), ''] : []),
  ...Object.entries(groups).flatMap(([g, list]) => [`## ${g}`, '', ...list.map((m) => `- [${m.title}](${m.path})${m.lastUpdated ? ` · ${m.lastUpdated}` : ''}`), '']),
].join('\n');
fs.writeFileSync(path.join(OUT, 'INDEX.md'), index);
console.log(`✔ ${manifest.length} pages → knowledge/google-search-docs/INDEX.md`);
