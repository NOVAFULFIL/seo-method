#!/usr/bin/env node
// ÉTAPE 4 — Fichiers « LLM search efficient » pour le site cible :
//   llms.txt        index Markdown (spec llmstxt.org) des pages clés
//   llms-full.txt   contenu complet des pages en Markdown (un seul fichier)
//   md/<chemin>.md  version Markdown propre de chaque page (servable à <url>.md)
//   robots-ai.txt   bloc robots.txt recommandé pour les crawlers IA
//   organization.jsonld  entité Organization + WebSite (cohérence de marque pour les LLM)
// Usage : npm run llms [-- --url https://site.com --max 150]
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { loadConfig, arg, reportDir } from '../lib/config.js';
import { createClient } from '../lib/http.js';
import { crawl, readSitemaps } from '../lib/crawl.js';
import { extractPage } from '../lib/extract.js';

const cfg = loadConfig();
const site = arg('url', cfg.site);
const origin = new URL(site).origin;
const client = createClient(cfg);
const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
td.use(gfm);

const robots = await client.robots(origin);
const sm = await readSitemaps(client, robots.sitemaps.length ? robots.sitemaps : [`${origin}/sitemap.xml`]);
const pages = [];
console.log(`▶ Génération des fichiers LLM pour ${origin}`);
await crawl(client, site, {
  maxPages: Number(arg('max', Math.min(cfg.maxPages || 150, 150))),
  seeds: sm.urls.map((u) => u.loc).filter((u) => u.startsWith(origin)).slice(0, 1000),
  onPage: (res) => {
    const p = extractPage(res.body, res.finalUrl);
    if (/noindex/i.test(p.metaRobots) || (p.canonical && !sameUrl(p.canonical, p.url))) return p.internalLinks;
    // Site multilingue : ne garder que la langue cible (sinon un llms.txt par langue via --lang).
    const lang = arg('lang', cfg.language);
    if (lang && p.lang && !p.lang.toLowerCase().startsWith(lang.toLowerCase())) return p.internalLinks;
    const $ = cheerio.load(res.body);
    $('script,style,noscript,nav,header,footer,aside,form,svg,iframe,button,[aria-hidden="true"],.cookie,#cookie-banner').remove();
    const main = $('article').first().length ? $('article').first() : $('main').first().length ? $('main').first() : $('body');
    main.find('a[href]').each((_, el) => { try { $(el).attr('href', new URL($(el).attr('href'), p.url).toString()); } catch {} });
    const markdown = td.turndown(main.html() || '').replace(/!\[\]\([^)]*\)/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    pages.push({ url: p.url, title: (p.h1[0] || p.title || p.url).replace(/\s+/g, ' ').trim(), description: p.metaDescription, markdown, words: p.words, kind: classify(p.url, cfg) });
    return p.internalLinks;
  },
});

function sameUrl(a, b) { try { const x = new URL(a, b), y = new URL(b); return x.origin + x.pathname.replace(/\/$/, '') === y.origin + y.pathname.replace(/\/$/, ''); } catch { return false; } }
function classify(url, c) {
  const p = new URL(url).pathname.toLowerCase();
  if (p === '/' || p === '') return 'home';
  if (c.blogPathHints.some((h) => p.startsWith(h))) return 'blog';
  if (/mentions|legal|cgv|cgu|privacy|confidentialite|cookies|terms/.test(p)) return 'legal';
  if (/contact|about|a-propos|qui-sommes|equipe|team/.test(p)) return 'about';
  if (/tarif|prix|pricing/.test(p)) return 'pricing';
  return 'page';
}

const dedupe = [...new Map(pages.filter((p) => p.words > 40).map((p) => [p.url, p])).values()];
const order = { home: 0, pricing: 1, page: 2, about: 3, blog: 4, legal: 5 };
dedupe.sort((a, b) => order[a.kind] - order[b.kind] || b.words - a.words);
const line = (p) => `- [${p.title.replace(/[[\]]/g, '')}](${p.url})${p.description ? `: ${p.description}` : ''}`;
const sect = (name, kinds) => { const l = dedupe.filter((p) => kinds.includes(p.kind)); return l.length ? [`## ${name}`, '', ...l.map(line), ''] : []; };

const home = dedupe.find((p) => p.kind === 'home');
const llms = [
  `# ${cfg.brand || new URL(site).hostname}`, '',
  `> ${cfg.description || home?.description || ''}`, '',
  `Site officiel : ${origin} · Langue : ${cfg.language || 'fr'} · Dernière mise à jour : ${new Date().toISOString().slice(0, 10)}`, '',
  ...sect('Pages principales', ['home', 'pricing', 'page']),
  ...sect('À propos & contact', ['about']),
  ...sect('Blog & guides', ['blog']),
  ...sect('Optional', ['legal']),
].join('\n');

const full = [
  `# ${cfg.brand || new URL(site).hostname} — contenu complet`, '', `> ${cfg.description || ''}`, '',
  ...dedupe.filter((p) => p.kind !== 'legal').flatMap((p) => ['---', '', `Source: ${p.url}`, '', p.markdown.startsWith('# ') ? p.markdown : `# ${p.title}\n\n${p.markdown}`, '']),
].join('\n');

const robotsAi = `# --- Crawlers IA (généré par seo-method) ---
# Moteurs de réponse / recherche IA : AUTORISER pour être cité dans ChatGPT Search, Claude, Perplexity.
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
Allow: /

# Entraînement des modèles : décision business (Allow = plus de notoriété dans les modèles, Disallow = contenu protégé).
# Google-Extended n'affecte PAS le classement ni les AI Overviews de Google Search.
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: CCBot
Allow: /

Sitemap: ${robots.sitemaps[0] || `${origin}/sitemap.xml`}
`;

const org = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${origin}/#organization`, name: cfg.brand, url: origin, description: cfg.description, logo: `${origin}/logo.png`, sameAs: cfg.sameAs || [] },
    { '@type': 'WebSite', '@id': `${origin}/#website`, url: origin, name: cfg.brand, inLanguage: cfg.language || 'fr', publisher: { '@id': `${origin}/#organization` } },
  ],
};

const dir = path.join(reportDir(site), 'llm');
fs.mkdirSync(path.join(dir, 'md'), { recursive: true });
fs.writeFileSync(path.join(dir, 'llms.txt'), llms);
fs.writeFileSync(path.join(dir, 'llms-full.txt'), full);
fs.writeFileSync(path.join(dir, 'robots-ai.txt'), robotsAi);
fs.writeFileSync(path.join(dir, 'organization.jsonld'), JSON.stringify(org, null, 2));
for (const p of dedupe) {
  const rel = (new URL(p.url).pathname.replace(/\/$/, '') || '/index').replace(/^\//, '') + '.md';
  const f = path.join(dir, 'md', rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, `# ${p.title}\n\nSource: ${p.url}\n\n${p.markdown}\n`);
}
console.log(`✔ ${dedupe.length} pages → ${path.relative(process.cwd(), dir)}/ (llms.txt, llms-full.txt, md/, robots-ai.txt, organization.jsonld)`);
