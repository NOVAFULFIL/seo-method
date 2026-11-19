import * as cheerio from 'cheerio';

const STOPWORDS = new Set((
  'le la les un une des du de d l et ou en au aux a à ce ces cet cette pour par sur dans avec sans que qui quoi dont est sont être avoir ' +
  'plus moins tout tous toute toutes votre vos notre nos son sa ses leur leurs mon ma mes ton ta tes il elle ils elles on nous vous je tu ' +
  'ne pas se s y comme mais si car donc ni comment pourquoi quand quel quelle quels quelles faire bien très aussi même entre vers chez ' +
  'the a an and or of to in on for with by from is are be your our how what why when which you we it its this that these those as at ' +
  'guide 2024 2025 2026 meilleur meilleure meilleurs top new nouveau ' +
  'thanks thank very some despite make makes made yours today best due can will get got just about into over more most also than then there their them they who all any each every other such only own same so too here now one two three way ways need want use using know'
).split(/\s+/));

export function normalizeUrl(href, base) {
  try {
    const u = new URL(href, base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = '';
    for (const p of [...u.searchParams.keys()]) if (/^(utm_|gclid|fbclid|mc_|ref$)/i.test(p)) u.searchParams.delete(p);
    return u.toString();
  } catch { return null; }
}

/** Extrait tous les signaux SEO on-page d'un document HTML. */
export function extractPage(html, url) {
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;
  const text = (s) => $(s).first().text().replace(/\s+/g, ' ').trim();
  const attr = (s, a) => ($(s).first().attr(a) || '').trim();

  const headings = [];
  $('h1,h2,h3,h4').each((_, el) => headings.push({ level: Number(el.tagName[1]), text: $(el).text().replace(/\s+/g, ' ').trim() }));

  const jsonld = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      const flat = (d) => (Array.isArray(d) ? d.flatMap(flat) : d && d['@graph'] ? flat(d['@graph']) : [d]);
      jsonld.push(...flat(data));
    } catch { jsonld.push({ '@type': 'INVALID_JSON' }); }
  });
  const schemaTypes = [...new Set(jsonld.flatMap((d) => [].concat(d?.['@type'] || [])))];

  const internal = new Set();
  const external = new Set();
  const anchors = [];
  $('a[href]').each((_, el) => {
    const href = normalizeUrl($(el).attr('href'), url);
    if (!href) return;
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (new URL(href).origin === origin) { internal.add(href); anchors.push({ href, text: t, rel: $(el).attr('rel') || '' }); }
    else external.add(href);
  });

  const images = [];
  $('img').each((_, el) => images.push({
    src: $(el).attr('src') || $(el).attr('data-src') || '',
    alt: $(el).attr('alt'),
    loading: $(el).attr('loading') || '',
    width: $(el).attr('width') || '',
    height: $(el).attr('height') || '',
  }));

  const hreflang = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => hreflang.push({ lang: $(el).attr('hreflang'), href: $(el).attr('href') }));

  // Corps éditorial : on retire la navigation pour compter les mots.
  const $body = cheerio.load(html);
  $body('script,style,noscript,nav,header,footer,aside,form,svg,iframe').remove();
  const mainEl = $body('article').first().length ? $body('article').first() : $body('main').first().length ? $body('main').first() : $body('body');
  const bodyText = mainEl.text().replace(/\s+/g, ' ').trim();
  const words = bodyText ? bodyText.split(' ').length : 0;

  const published = attr('meta[property="article:published_time"]', 'content') || attr('time[datetime]', 'datetime') ||
    jsonld.map((d) => d?.datePublished).find(Boolean) || '';
  const modified = attr('meta[property="article:modified_time"]', 'content') || jsonld.map((d) => d?.dateModified).find(Boolean) || '';
  const author = attr('meta[name="author"]', 'content') ||
    jsonld.map((d) => (typeof d?.author === 'string' ? d.author : [].concat(d?.author || [])[0]?.name)).find(Boolean) || '';

  return {
    url,
    lang: attr('html', 'lang'),
    title: text('head title'),
    metaDescription: attr('meta[name="description"]', 'content'),
    metaRobots: attr('meta[name="robots"]', 'content'),
    canonical: attr('link[rel="canonical"]', 'href'),
    viewport: attr('meta[name="viewport"]', 'content'),
    og: { title: attr('meta[property="og:title"]', 'content'), description: attr('meta[property="og:description"]', 'content'), image: attr('meta[property="og:image"]', 'content') },
    twitterCard: attr('meta[name="twitter:card"]', 'content'),
    h1: headings.filter((h) => h.level === 1).map((h) => h.text),
    headings,
    schemaTypes,
    jsonld,
    hreflang,
    internalLinks: [...internal],
    externalLinks: [...external],
    anchors,
    images,
    words,
    bodyText: bodyText.slice(0, 20000),
    published,
    modified,
    author,
    faqCount: $('details, [itemtype*="FAQPage"]').length,
    tables: $('table').length,
    lists: $('ul,ol').length,
  };
}

export function tokenize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

/** n-grammes (1..3) d'un texte, sans mots vides. */
export function ngrams(str, max = 3) {
  const t = tokenize(str);
  const out = [];
  for (let n = 1; n <= max; n++) for (let i = 0; i + n <= t.length; i++) out.push(t.slice(i, i + n).join(' '));
  return out;
}
