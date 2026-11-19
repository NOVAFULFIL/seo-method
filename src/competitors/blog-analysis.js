#!/usr/bin/env node
// ÉTAPE 2 — Analyse poussée des blogs concurrents + backlog d'articles.
// Usage : npm run competitors [-- --max 200]
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, arg, reportDir, writeJSON, toCSV, ROOT } from '../lib/config.js';
import { createClient } from '../lib/http.js';
import { readSitemaps, crawl } from '../lib/crawl.js';
import { extractPage, ngrams, tokenize } from '../lib/extract.js';

const FORMAT_RULES = [
  ['comparatif', /\b(vs|versus|comparatif|compar|alternative|meilleur|top \d+|classement)\b/i],
  ['liste', /^\s*\d+\s|\b\d+\s+(astuces|conseils|idées|erreurs|étapes|outils|façons|raisons|tips|ways|tools)\b/i],
  ['tutoriel', /\b(comment|how to|tuto|étape|step|créer|configurer|installer|mettre en place)\b/i],
  ['définition', /\b(qu.est.ce|c.est quoi|définition|what is|signification|guide complet)\b/i],
  ['prix / coût', /\b(prix|tarif|coût|cout|combien|pricing|cost)\b/i],
  ['étude de cas', /\b(cas client|étude de cas|case study|témoignage|retour d.expérience)\b/i],
  ['actualité', /\b(nouveau|nouvelle|annonce|2025|2026|mise à jour|update|tendances?|trends?)\b/i],
];
const detectFormat = (t) => (FORMAT_RULES.find(([, re]) => re.test(t)) || ['guide'])[0];

function looksLikeArticle(url, hints) {
  const u = new URL(url);
  const p = u.pathname.toLowerCase();
  if (p === '/' || /\/(tag|tags|category|categorie|author|auteur|page)\/|\/feed\/?$/.test(p)) return false;
  return hints.some((h) => p.startsWith(h.toLowerCase() + '/') && p.length > h.length + 2);
}

async function discoverArticles(client, base, cfg, max) {
  const origin = new URL(base).origin;
  const robots = await client.robots(origin);
  const sm = await readSitemaps(client, robots.sitemaps.length ? robots.sitemaps : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]);
  const hints = cfg.blogPathHints;
  // 1) URLs du sitemap qui ressemblent à des articles
  let found = sm.urls.filter((u) => { try { return looksLikeArticle(u.loc, hints); } catch { return false; } });
  // 2) WordPress & co : sitemap dédié aux posts
  if (!found.length) {
    const postMaps = sm.sitemapsRead.filter((s) => /post|blog|article|news/i.test(s) && !/category|tag|author/i.test(s));
    if (postMaps.length) {
      const posts = await readSitemaps(client, postMaps);
      found = posts.urls.filter((u) => u.loc && new URL(u.loc).pathname.length > 1);
    }
  }
  // 3) Repli : crawl depuis les pages blog
  if (!found.length) {
    for (const h of hints) {
      const r = await client.get(origin + h);
      if (r.status !== 200) continue;
      const { results } = await crawl(client, origin + h, {
        maxPages: Math.min(max * 2, 400), log: false,
        filter: (u) => hints.some((x) => new URL(u).pathname.startsWith(x)),
        onPage: (res) => extractPage(res.body, res.finalUrl).internalLinks,
      });
      found = results.filter((x) => x.status === 200 && looksLikeArticle(x.finalUrl, hints)).map((x) => ({ loc: x.finalUrl, lastmod: '' }));
      if (found.length) break;
    }
  }
  const uniq = [...new Map(found.map((u) => [u.loc, u])).values()];
  uniq.sort((a, b) => (b.lastmod || '').localeCompare(a.lastmod || '')); // les plus récents d'abord
  return { candidates: uniq.length, list: uniq.slice(0, max), robots };
}

async function analyseCompetitor(client, base, cfg) {
  const max = Number(arg('max', cfg.competitorMaxArticles || 200));
  console.log(`\n▶ ${base}`);
  const { candidates, list, robots } = await discoverArticles(client, base, cfg, max);
  console.log(`  ${candidates} articles détectés, analyse de ${list.length}`);
  const articles = [];
  const errors = {};
  let i = 0;
  for (const { loc, lastmod } of list) {
    i++;
    if (!robots.allowed(loc)) continue;
    const r = await client.get(loc);
    process.stdout.write(`\r  ${i}/${list.length} ${r.status} ${loc.slice(0, 80).padEnd(80)}`);
    if (r.status !== 200 || !(r.headers['content-type'] || '').includes('html')) { errors[r.status] = (errors[r.status] || 0) + 1; continue; }
    const p = extractPage(r.body, r.finalUrl);
    articles.push({
      competitor: new URL(base).hostname.replace(/^www\./, ''),
      url: p.url,
      title: p.h1[0] || p.title,
      metaTitle: p.title,
      metaDescription: p.metaDescription,
      published: (p.published || '').slice(0, 10),
      modified: (p.modified || lastmod || '').slice(0, 10),
      author: p.author,
      words: p.words,
      h2: p.headings.filter((h) => h.level === 2).map((h) => h.text).filter(Boolean),
      h3count: p.headings.filter((h) => h.level === 3).length,
      schema: p.schemaTypes,
      internalLinks: p.internalLinks.length,
      externalLinks: p.externalLinks.length,
      images: p.images.length,
      tables: p.tables,
      hasFaq: p.faqCount > 0 || p.schemaTypes.includes('FAQPage') || p.headings.some((h) => /faq|questions fréquentes/i.test(h.text)),
      format: detectFormat(p.h1[0] || p.title),
    });
  }
  process.stdout.write('\n');
  if (errors[403] || errors[429]) console.log(`  ⚠ ${(errors[403] || 0) + (errors[429] || 0)} pages refusées (403/429 : protection anti-bot). Utiliser l'export Firecrawl/DataForSEO ou le navigateur (voir README).`);
  return { base, candidates, articles, errors };
}

/** Regroupe les articles en clusters thématiques via les n-grammes partagés. */
function clusterTopics(articles, ownTexts, brandTokens = new Set()) {
  const clean = (gs) => gs.filter((g) => !g.split(' ').some((w) => brandTokens.has(w)));
  const docs = articles.map((a) => new Set(clean(ngrams(`${a.title} ${a.title} ${a.h2.slice(0, 8).join(' ')}`))));
  const df = new Map();
  docs.forEach((s, idx) => s.forEach((g) => {
    const e = df.get(g) || { docs: new Set(), comps: new Set() };
    e.docs.add(idx); e.comps.add(articles[idx].competitor); df.set(g, e);
  }));
  const weight = (g) => { const e = df.get(g); const n = g.split(' ').length; return e.docs.size * (n === 1 ? 1 : n === 2 ? 2.2 : 2.8) * (1 + 0.5 * (e.comps.size - 1)); };
  const clusters = new Map();
  articles.forEach((a, idx) => {
    const all = clean(ngrams(a.title));
    const titleGrams = all.filter((g) => df.get(g)?.docs.size > 1);
    // Sujet = n-gramme partagé le plus fort ; sinon le bigramme le plus parlant du titre.
    const key = titleGrams.sort((x, y) => weight(y) - weight(x))[0] || all.find((g) => g.includes(' ')) || all[0] || 'divers';
    a.cluster = key;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(a);
  });
  const own = ownTexts.map((t) => new Set(ngrams(t)));
  return [...clusters.entries()].map(([topic, list]) => {
    const comps = [...new Set(list.map((a) => a.competitor))];
    const ownCoverage = own.filter((s) => s.has(topic)).length;
    const avgWords = Math.round(list.reduce((s, a) => s + a.words, 0) / list.length);
    // Sous-thèmes récurrents dans les H2 → plan éditorial suggéré
    const h2grams = new Map();
    for (const a of list) for (const g of new Set(clean(a.h2.flatMap((h) => ngrams(h, 2))))) h2grams.set(g, (h2grams.get(g) || 0) + 1);
    const subtopics = [...h2grams.entries()].filter(([g]) => g !== topic).sort((x, y) => y[1] - x[1]).slice(0, 10).map(([g, n]) => `${g} (${n})`);
    return {
      topic, articles: list.length, competitors: comps, competitorCount: comps.length,
      ownCoverage, gap: ownCoverage === 0, avgWords,
      formats: [...new Set(list.map((a) => a.format))],
      priority: Math.round((list.length + comps.length * 3) * (ownCoverage === 0 ? 2 : 1) * 10) / 10,
      subtopics, examples: list.slice(0, 5).map((a) => ({ title: a.title, url: a.url, words: a.words })),
    };
  }).sort((a, b) => b.priority - a.priority);
}

/** Transforme les clusters en backlog d'articles à créer (plus large que ce que font les concurrents). */
function buildBacklog(clusters, cfg) {
  const angles = [
    ['guide', (t) => `${cap(t)} : le guide complet ${new Date().getFullYear()}`],
    ['tutoriel', (t) => `${cap(t)} : mode d’emploi étape par étape`],
    ['liste', (t) => `${cap(t)} : les erreurs à éviter`],
    ['comparatif', (t) => `${cap(t)} : comparatif des solutions`],
    ['prix / coût', (t) => `${cap(t)} : prix et coûts à prévoir`],
    ['définition', (t) => `${cap(t)} : définition et exemples concrets`],
    ['FAQ', (t) => `${cap(t)} : réponses aux questions fréquentes`],
    ['étude de cas', (t) => `${cap(t)} : retour d’expérience chiffré`],
  ];
  const rows = [];
  for (const c of clusters.filter((c) => c.articles >= 1).slice(0, 80)) {
    const covered = new Set(c.formats);
    // 1) Le « pilier » du cluster, 2) les angles que les concurrents n'ont PAS traités
    const picks = [angles[0], ...angles.slice(1).filter(([f]) => !covered.has(f)).slice(0, c.competitorCount >= 2 ? 3 : 1)];
    for (const [format, make] of picks) {
      rows.push({
        priority: c.priority, cluster: c.topic, type: format === 'guide' ? 'pilier' : 'satellite', format,
        workingTitle: make(c.topic), gap: c.gap ? 'oui' : 'non',
        targetWords: Math.max(800, Math.round((c.avgWords * 1.2) / 100) * 100),
        competitorsCovering: c.competitors.join(' | '), mustCover: c.subtopics.slice(0, 6).join(' | '),
        inspiration: c.examples.slice(0, 3).map((e) => e.url).join(' | '),
        // À remplir avant validation : sans gain d'information réel, l'idée est écartée (cf. knowledge/seo-playbook.md §2).
        infoGain: '',
        decision: 'à qualifier',
      });
    }
  }
  return rows;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function competitorStats(c) {
  const a = c.articles;
  const byMonth = {};
  for (const x of a) if (x.published) byMonth[x.published.slice(0, 7)] = (byMonth[x.published.slice(0, 7)] || 0) + 1;
  const months = Object.keys(byMonth).sort();
  const last12 = months.slice(-12).reduce((s, m) => s + byMonth[m], 0);
  const pct = (f) => Math.round((a.filter(f).length / (a.length || 1)) * 100);
  return {
    competitor: new URL(c.base).hostname.replace(/^www\./, ''), articlesFound: c.candidates, analysed: a.length,
    avgWords: Math.round(a.reduce((s, x) => s + x.words, 0) / (a.length || 1)),
    medianWords: a.length ? a.map((x) => x.words).sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0,
    postsLast12Months: last12, pctWithFaq: pct((x) => x.hasFaq), pctWithSchemaArticle: pct((x) => x.schema.some((t) => /Article|BlogPosting/.test(t))),
    pctWithAuthor: pct((x) => !!x.author), pctWithTables: pct((x) => x.tables > 0), avgInternalLinks: Math.round(a.reduce((s, x) => s + x.internalLinks, 0) / (a.length || 1)),
    blocked: (c.errors?.[403] || 0) + (c.errors?.[429] || 0),
    formats: Object.entries(a.reduce((m, x) => ((m[x.format] = (m[x.format] || 0) + 1), m), {})).sort((x, y) => y[1] - x[1]).map(([f, n]) => `${f} ${n}`).join(', '),
  };
}

function markdown(stats, clusters, backlog, cfg) {
  const L = [`# Analyse des blogs concurrents`, '', `Généré le ${new Date().toISOString().slice(0, 10)} pour ${cfg.site}`, '', '## Concurrents', '',
    '| Concurrent | Articles | Analysés | Bloqués | Mots moy. | Médiane | Posts 12 mois | FAQ % | Schema Article % | Auteur % | Liens int. moy. | Formats |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...stats.map((s) => `| ${s.competitor} | ${s.articlesFound} | ${s.analysed} | ${s.blocked} | ${s.avgWords} | ${s.medianWords} | ${s.postsLast12Months} | ${s.pctWithFaq} | ${s.pctWithSchemaArticle} | ${s.pctWithAuthor} | ${s.avgInternalLinks} | ${s.formats} |`),
    '', '## Clusters thématiques (priorité décroissante)', '', '`gap = oui` → sujet traité par les concurrents mais absent de notre site.', '',
    '| Priorité | Sujet | Articles | Concurrents | Gap | Mots moy. | Sous-thèmes récurrents |', '|---|---|---|---|---|---|---|',
    ...clusters.slice(0, 60).map((c) => `| ${c.priority} | **${c.topic}** | ${c.articles} | ${c.competitorCount} | ${c.gap ? 'oui' : 'non'} | ${c.avgWords} | ${c.subtopics.slice(0, 5).join(', ')} |`),
    '', '> Les titres de travail sont des brouillons générés automatiquement : ce sont des **candidats**, pas un plan de publication. Une idée n’est retenue que si on peut remplir la colonne `infoGain` (donnée, expérience ou expertise propre). Publier toutes les variantes = « scaled content abuse » selon Google.', '', `## Backlog d’articles proposé (${backlog.length})`, '', 'Liste complète : `article-backlog.csv`. Chaque ligne se transforme en brief via `templates/article-brief.md`.', '',
    '| # | Titre de travail | Type | Format | Cluster | Mots cibles | Gap |', '|---|---|---|---|---|---|---|',
    ...backlog.slice(0, 100).map((b, i) => `| ${i + 1} | ${b.workingTitle} | ${b.type} | ${b.format} | ${b.cluster} | ${b.targetWords} | ${b.gap} |`)];
  return L.join('\n') + '\n';
}

// ---------------------------------------------------------------------
const cfg = loadConfig();
const client = createClient(cfg);
const results = [];
for (const c of cfg.competitors) results.push(await analyseCompetitor(client, c, cfg));
const articles = results.flatMap((r) => r.articles);

// Couverture de notre site : réutilise l'audit si disponible.
const ownDir = reportDir(cfg.site);
let ownTexts = [];
const ownPages = path.join(ownDir, 'pages.json');
if (fs.existsSync(ownPages)) ownTexts = JSON.parse(fs.readFileSync(ownPages, 'utf8')).map((p) => `${p.title} ${p.h1?.join(' ')} ${p.headings?.map((h) => h.text).join(' ')}`);
else console.log('ℹ Lance `npm run audit` d’abord pour détecter les sujets déjà couverts par ton site (gap analysis).');

const brandTokens = new Set([cfg.site, ...cfg.competitors].flatMap((u) => tokenize(new URL(u).hostname.replace(/^www\./, '').split('.')[0])));
for (const t of tokenize(cfg.brand || '')) brandTokens.add(t);
const clusters = clusterTopics(articles, ownTexts, brandTokens);
const backlog = buildBacklog(clusters, cfg);
const stats = results.map(competitorStats);

const out = path.join(ROOT, 'reports', 'competitors');
writeJSON(path.join(out, 'articles.json'), articles);
fs.writeFileSync(path.join(out, 'articles.csv'), toCSV(articles.map(({ h2, ...a }) => ({ ...a, h2: h2.slice(0, 12) }))));
writeJSON(path.join(out, 'clusters.json'), clusters);
fs.writeFileSync(path.join(out, 'article-backlog.csv'), toCSV(backlog));
fs.writeFileSync(path.join(out, 'competitors.md'), markdown(stats, clusters, backlog, cfg));
console.log(`\n✔ ${articles.length} articles · ${clusters.length} clusters · ${backlog.length} idées → reports/competitors/competitors.md`);
