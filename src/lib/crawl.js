import * as cheerio from 'cheerio';
import { normalizeUrl } from './extract.js';

const ASSET = /\.(jpe?g|png|gif|webp|avif|svg|ico|pdf|zip|mp4|mp3|webm|css|js|woff2?|ttf|xml|json|txt)$/i;

/** Lit récursivement les sitemaps (index + urlset). Renvoie [{loc, lastmod}]. */
export async function readSitemaps(client, startUrls, { limit = 20000 } = {}) {
  const seen = new Set();
  const queue = [...startUrls];
  const urls = [];
  while (queue.length && urls.length < limit) {
    const sm = queue.shift();
    if (seen.has(sm)) continue;
    seen.add(sm);
    const res = await client.get(sm, { accept: 'application/xml,text/xml' });
    if (res.status !== 200) continue;
    const $ = cheerio.load(res.body, { xmlMode: true });
    $('sitemap > loc').each((_, el) => queue.push($(el).text().trim()));
    $('url').each((_, el) => urls.push({ loc: $(el).find('loc').text().trim(), lastmod: $(el).find('lastmod').text().trim() }));
  }
  return { urls, sitemapsRead: [...seen] };
}

/**
 * Crawl BFS d'un site : graines = page d'accueil + sitemap.
 * onPage(res, links) renvoie les liens internes à suivre.
 */
export async function crawl(client, start, { maxPages = 300, filter = () => true, seeds = [], onPage, log = true } = {}) {
  const origin = new URL(start).origin;
  const robots = await client.robots(origin);
  const queue = [start, ...seeds];
  const seen = new Set(queue);
  const results = [];
  while (queue.length && results.length < maxPages) {
    const url = queue.shift();
    if (!robots.allowed(url)) { results.push({ url, status: 'blocked-by-robots' }); continue; }
    const res = await client.get(url);
    const type = res.headers['content-type'] || '';
    const page = { ...res, isHtml: type.includes('html') };
    const links = page.isHtml && res.status === 200 ? (await onPage?.(page)) || [] : [];
    delete page.body;
    results.push(page);
    if (log) process.stdout.write(`\r  ${results.length}/${maxPages} ${res.status} ${url.slice(0, 90).padEnd(90)}`);
    for (const l of links) {
      const n = normalizeUrl(l, url);
      if (!n || seen.has(n) || new URL(n).origin !== origin || ASSET.test(new URL(n).pathname) || !filter(n)) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  if (log) process.stdout.write('\n');
  return { results, robots };
}
