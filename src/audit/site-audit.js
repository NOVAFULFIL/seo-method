#!/usr/bin/env node
// ÉTAPE 1 — Audit complet du site cible.
// Usage : npm run audit [-- --url https://site.com --max 300]
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, arg, reportDir, writeJSON, toCSV } from '../lib/config.js';
import { createClient } from '../lib/http.js';
import { crawl, readSitemaps } from '../lib/crawl.js';
import { extractPage } from '../lib/extract.js';

const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'CCBot'];
const SEV = { critical: 10, high: 5, medium: 2, low: 1 };

export async function auditSite(site, cfg) {
  const client = createClient(cfg);
  const origin = new URL(site).origin;
  const issues = [];
  const add = (severity, code, message, urls = []) => issues.push({ severity, code, message, count: urls.length || 1, urls: urls.slice(0, 50) });

  console.log(`\n▶ Audit de ${origin}`);

  // --- Fichiers racine -------------------------------------------------
  const robots = await client.robots(origin);
  if (robots.status !== 200) add('high', 'robots-missing', 'robots.txt absent ou inaccessible.');
  const aiBots = Object.fromEntries(AI_BOTS.map((b) => {
    const p = robots.raw ? (/* re-parse avec l'UA du bot */ robotsAllowsRoot(robots.raw, b)) : true;
    return [b, p ? 'autorisé' : 'bloqué'];
  }));
  const llms = await client.get(`${origin}/llms.txt`, { accept: 'text/plain,text/markdown' });
  const hasLlms = llms.status === 200 && !/<html/i.test(llms.body.slice(0, 500));
  if (!hasLlms) add('medium', 'llms-missing', 'Pas de /llms.txt (fichier de découverte pour les moteurs IA). Génère-le avec `npm run llms`.');

  const smCandidates = robots.sitemaps.length ? robots.sitemaps : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  const sm = await readSitemaps(client, smCandidates);
  if (!sm.urls.length) add('high', 'sitemap-missing', 'Aucun sitemap XML trouvé (ni dans robots.txt, ni à /sitemap.xml).');
  if (!robots.sitemaps.length && sm.urls.length) add('low', 'sitemap-not-in-robots', 'Le sitemap n’est pas déclaré dans robots.txt.');

  const http = await client.get(origin.replace('https://', 'http://'), { redirect: 'manual' });
  if (origin.startsWith('https') && !(http.status >= 300 && http.status < 400)) add('high', 'no-https-redirect', 'La version http:// ne redirige pas vers https://.');

  // --- Crawl -----------------------------------------------------------
  const pages = new Map();
  const { results } = await crawl(client, site, {
    maxPages: Number(arg('max', cfg.maxPages || 300)),
    seeds: sm.urls.slice(0, 2000).map((u) => u.loc).filter((u) => { try { return new URL(u).origin === origin; } catch { return false; } }),
    onPage: (res) => {
      const p = extractPage(res.body, res.finalUrl);
      pages.set(res.url, { ...p, status: res.status, ttfb: res.ttfb, bytes: res.bytes, headers: res.headers });
      return p.internalLinks;
    },
  });

  // --- Analyse par page ------------------------------------------------
  const inbound = new Map();
  for (const p of pages.values()) for (const l of p.internalLinks) inbound.set(l, (inbound.get(l) || 0) + 1);

  const broken = results.filter((r) => typeof r.status === 'number' && (r.status >= 400 || r.status === 0)).map((r) => `${r.url} (${r.status})`);
  if (broken.length) add('critical', 'broken-pages', 'Pages en erreur (4xx/5xx/timeout).', broken);
  const redirected = results.filter((r) => r.redirected).map((r) => `${r.url} → ${r.finalUrl}`);
  if (redirected.length) add('medium', 'redirects', 'URLs liées/listées qui redirigent (mettre à jour les liens internes et le sitemap).', redirected);
  const blocked = results.filter((r) => r.status === 'blocked-by-robots').map((r) => r.url);
  if (blocked.length) add('medium', 'sitemap-blocked', 'URLs du sitemap bloquées par robots.txt.', blocked);

  const ok = [...pages.values()].filter((p) => p.status === 200);
  const indexable = ok.filter((p) => !/noindex/i.test(p.metaRobots) && !/noindex/i.test(p.headers['x-robots-tag'] || ''));
  const byField = (f) => { const m = new Map(); for (const p of indexable) { const v = p[f]; if (v) m.set(v, [...(m.get(v) || []), p.url]); } return [...m.values()].filter((l) => l.length > 1).flat(); };

  const check = (sev, code, msg, pred) => { const u = indexable.filter(pred).map((p) => p.url); if (u.length) add(sev, code, msg, u); };
  check('high', 'title-missing', 'Balise <title> manquante.', (p) => !p.title);
  check('medium', 'title-long', 'Title > 60 caractères (risque de réécriture/troncature par Google).', (p) => p.title.length > 60);
  check('low', 'title-short', 'Title < 25 caractères (sous-exploité).', (p) => p.title && p.title.length < 25);
  const dupT = byField('title'); if (dupT.length) add('high', 'title-duplicate', 'Titles dupliqués.', dupT);
  check('medium', 'meta-desc-missing', 'Meta description manquante.', (p) => !p.metaDescription);
  check('low', 'meta-desc-length', 'Meta description hors 70–160 caractères.', (p) => p.metaDescription && (p.metaDescription.length < 70 || p.metaDescription.length > 160));
  const dupD = byField('metaDescription'); if (dupD.length) add('medium', 'meta-desc-duplicate', 'Meta descriptions dupliquées.', dupD);
  check('high', 'h1-missing', 'H1 manquant.', (p) => p.h1.length === 0);
  check('low', 'h1-multiple', 'Plusieurs H1.', (p) => p.h1.length > 1);
  check('medium', 'canonical-missing', 'Balise canonical absente.', (p) => !p.canonical);
  check('medium', 'canonical-other', 'Canonical pointant vers une autre URL (vérifier que c’est voulu).', (p) => p.canonical && normalize(p.canonical, p.url) !== normalize(p.url, p.url));
  check('medium', 'thin-content', 'Contenu mince (< 300 mots dans le corps principal).', (p) => p.words < 300);
  check('medium', 'img-alt-missing', 'Images sans attribut alt.', (p) => p.images.some((i) => i.alt === undefined));
  check('low', 'img-no-dimensions', 'Images sans width/height (risque de CLS).', (p) => p.images.some((i) => !i.width || !i.height));
  check('medium', 'schema-missing', 'Aucune donnée structurée JSON-LD.', (p) => p.schemaTypes.length === 0);
  check('high', 'schema-invalid', 'JSON-LD invalide (erreur de parsing).', (p) => p.schemaTypes.includes('INVALID_JSON'));
  check('low', 'schema-deprecated', 'Balisage FAQPage/HowTo : plus de résultat enrichi Google (FAQ déprécié en mai 2026). Inoffensif, mais inutile pour Google.', (p) => p.schemaTypes.some((t) => t === 'FAQPage' || t === 'HowTo'));
  check('low', 'og-missing', 'Balises Open Graph manquantes (og:title / og:image).', (p) => !p.og.title || !p.og.image);
  check('low', 'lang-missing', 'Attribut lang manquant sur <html>.', (p) => !p.lang);
  check('high', 'viewport-missing', 'Meta viewport manquante (mobile).', (p) => !p.viewport);
  check('medium', 'slow-ttfb', 'TTFB > 800 ms (côté serveur, à confirmer avec CrUX/PageSpeed).', (p) => p.ttfb > 800);
  check('low', 'heavy-html', 'HTML > 500 Ko.', (p) => p.bytes > 500_000);
  check('medium', 'weak-internal-links', 'Pages recevant ≤ 1 lien interne (quasi orphelines).', (p) => (inbound.get(p.url) || 0) <= 1 && p.url !== site && p.url !== site + '/');
  const noindexed = ok.filter((p) => !indexable.includes(p)).map((p) => p.url);
  if (noindexed.length) add('low', 'noindex', 'Pages en noindex (vérifier que c’est voulu).', noindexed);

  const smSet = new Set(sm.urls.map((u) => u.loc));
  const notInSm = indexable.filter((p) => !smSet.has(p.url)).map((p) => p.url);
  if (sm.urls.length && notInSm.length) add('low', 'not-in-sitemap', 'Pages indexables absentes du sitemap.', notInSm);

  const h = pages.get(site) || [...pages.values()][0] || { headers: {} };
  const secHeaders = ['strict-transport-security', 'content-security-policy', 'x-content-type-options', 'referrer-policy'];
  const missingSec = secHeaders.filter((x) => !h.headers?.[x]);
  if (missingSec.length) add('low', 'security-headers', `En-têtes de sécurité manquants : ${missingSec.join(', ')}.`);

  // --- Score & inventaire de contenu ----------------------------------
  // Pénalité = gravité × (0.4 + 0.6 × part des pages touchées) ; un problème global compte comme 100 %.
  const total = Math.max(indexable.length, 1);
  const penalty = issues.reduce((s, i) => s + SEV[i.severity] * (0.4 + 0.6 * Math.min(i.urls.length ? i.count / total : 1, 1)), 0);
  const score = Math.max(0, Math.round(100 - penalty));
  issues.sort((a, b) => SEV[b.severity] - SEV[a.severity] || b.count - a.count);

  const inventory = [...pages.values()].map((p) => ({
    url: p.url, status: p.status, title: p.title, titleLen: p.title?.length || 0, metaDescLen: p.metaDescription?.length || 0,
    h1: p.h1?.[0] || '', words: p.words, schema: p.schemaTypes, inboundLinks: inbound.get(p.url) || 0, outLinks: p.internalLinks?.length || 0,
    canonical: p.canonical, robots: p.metaRobots, ttfbMs: p.ttfb, published: p.published, modified: p.modified,
  }));

  const schemaUsage = {};
  for (const p of ok) for (const t of p.schemaTypes) schemaUsage[t] = (schemaUsage[t] || 0) + 1;

  return {
    site: origin, auditedAt: new Date().toISOString(), score,
    stats: { crawled: results.length, ok: ok.length, indexable: indexable.length, sitemapUrls: sm.urls.length, avgWords: Math.round(ok.reduce((s, p) => s + p.words, 0) / (ok.length || 1)) },
    files: { robotsTxt: robots.status === 200, llmsTxt: hasLlms, sitemaps: sm.sitemapsRead },
    aiBots, schemaUsage, issues, inventory,
    _pages: [...pages.values()],
  };
}

function normalize(u, base) { try { const x = new URL(u, base); return (x.origin + x.pathname).replace(/\/$/, ''); } catch { return u; } }

function robotsAllowsRoot(raw, bot) {
  // Un bot est « bloqué » si son groupe (ou *) interdit « / ».
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim());
  let agents = []; let inRules = false; const groups = [];
  for (const l of lines) {
    const m = l.match(/^([\w-]+)\s*:\s*(.*)$/); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') { if (inRules) { agents = []; inRules = false; } agents.push(v.toLowerCase()); if (agents.length === 1) groups.push({ agents, rules: [] }); }
    else if (k === 'allow' || k === 'disallow') { inRules = true; groups.at(-1)?.rules.push({ k, v }); }
  }
  const g = groups.find((x) => x.agents.includes(bot.toLowerCase())) || groups.find((x) => x.agents.includes('*'));
  if (!g) return true;
  const allowRoot = g.rules.some((r) => r.k === 'allow' && r.v === '/');
  return allowRoot || !g.rules.some((r) => r.k === 'disallow' && r.v === '/');
}

export function auditMarkdown(a) {
  const sevIcon = { critical: '🔴', high: '🟠', medium: '🟡', low: '⚪' };
  const lines = [
    `# Audit SEO — ${a.site}`, '', `Généré le ${a.auditedAt.slice(0, 10)} · **Score : ${a.score}/100**`, '',
    '## Vue d’ensemble', '',
    `| Pages crawlées | 200 OK | Indexables | URLs sitemap | Mots moyens |`, `|---|---|---|---|---|`,
    `| ${a.stats.crawled} | ${a.stats.ok} | ${a.stats.indexable} | ${a.stats.sitemapUrls} | ${a.stats.avgWords} |`, '',
    `- robots.txt : ${a.files.robotsTxt ? '✅' : '❌'} · llms.txt : ${a.files.llmsTxt ? '✅' : '❌'} · sitemaps lus : ${a.files.sitemaps.length}`, '',
    '## Robots IA', '', '| Bot | Statut |', '|---|---|', ...Object.entries(a.aiBots).map(([b, s]) => `| ${b} | ${s} |`), '',
    '## Données structurées utilisées', '', ...(Object.keys(a.schemaUsage).length ? Object.entries(a.schemaUsage).sort((x, y) => y[1] - x[1]).map(([t, n]) => `- ${t} : ${n} pages`) : ['- Aucune']), '',
    '## Problèmes (par priorité)', '',
  ];
  for (const i of a.issues) {
    lines.push(`### ${sevIcon[i.severity]} ${i.message} — ${i.count}`, '', `\`${i.code}\``, '');
    for (const u of i.urls.slice(0, 10)) lines.push(`- ${u}`);
    if (i.urls.length > 10) lines.push(`- … (+${i.count - 10}, voir audit.json)`);
    lines.push('');
  }
  lines.push('## Pages les plus faibles (contenu)', '', '| URL | Mots | Liens entrants | Title |', '|---|---|---|---|');
  for (const p of a.inventory.filter((p) => p.status === 200).sort((x, y) => x.words - y.words).slice(0, 15)) lines.push(`| ${p.url} | ${p.words} | ${p.inboundLinks} | ${p.title.replace(/\|/g, '/')} |`);
  return lines.join('\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('site-audit.js')) {
  const cfg = loadConfig();
  const site = arg('url', cfg.site);
  const a = await auditSite(site, cfg);
  const dir = reportDir(site);
  const { _pages, ...pub } = a;
  writeJSON(path.join(dir, 'audit.json'), pub);
  writeJSON(path.join(dir, 'pages.json'), _pages.map(({ bodyText, headers, jsonld, anchors, ...p }) => p));
  fs.writeFileSync(path.join(dir, 'pages.csv'), toCSV(a.inventory));
  fs.writeFileSync(path.join(dir, 'audit.md'), auditMarkdown(a));
  console.log(`✔ Score ${a.score}/100 · ${a.issues.length} types de problèmes → ${path.relative(process.cwd(), dir)}/audit.md`);
}
