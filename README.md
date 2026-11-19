# seo-method

Méthode SEO outillée, de l'audit à la publication :

| # | Étape | Commande | Sortie |
|---|---|---|---|
| 1 | **Audit complet du site** : crawl (sitemap + liens), robots.txt, sitemap, llms.txt, robots IA, HTTPS, titles, metas, H1, canonical, noindex, contenu mince, maillage interne, images, données structurées, TTFB, en-têtes de sécurité → score /100 | `npm run audit` | `reports/<domaine>/audit.md` |
| 2 | **Analyse des blogs concurrents** : détection des articles (sitemap → sitemap posts → crawl), extraction titre / H2 / longueur / dates / auteur / schema / FAQ / maillage, rythme de publication, clusters thématiques, gap avec notre site, **backlog d'articles élargi** | `npm run competitors` | `reports/competitors/competitors.md`, `article-backlog.csv` |
| 3 | **Documentation Google à jour** : aspiration de Google Search Central (docs, mises à jour de classement, blog récent) en Markdown + synthèse actionnable | `npm run google-docs` | `knowledge/google-search-docs/`, `knowledge/seo-playbook.md` |
| 4 | **Rédaction SEO** : brief → article, gabarits et checklist alignés sur la doc Google | (Claude, voir `CLAUDE.md`) | `content/` |
| 5 | **Fichiers LLM search** : `llms.txt`, `llms-full.txt`, pages en `.md`, bloc robots.txt pour crawlers IA, JSON-LD Organization | `npm run llms` | `reports/<domaine>/llm/` |

## Installation

```bash
npm install
```

```bash
cp config/project.example.json config/project.json
```

Remplir `config/project.json` : `site`, `brand`, `description`, `language`, `competitors` (3 à 5 sites les mieux classés sur tes requêtes cibles), `blogPathHints` si leurs blogs ne sont pas sous `/blog`.

## Utilisation

```bash
npm run audit
```

```bash
npm run competitors
```

```bash
npm run llms
```

Options : `--url <site>` (cibler un autre site), `--max <n>` (pages/articles max), `--config <fichier>`, `--lang <code>` (llms).
La base Google se met à jour avec `npm run google-docs` (option `--blog-since 2025`).

Ensuite, ouvrir le repo avec Claude Code : `CLAUDE.md` décrit comment transformer les rapports en plan technique, plan de contenu, briefs et articles.

## Déployer les fichiers LLM

Depuis `reports/<domaine>/llm/` :

- `llms.txt` et `llms-full.txt` → racine du site (`https://site.com/llms.txt`), servis en `text/plain; charset=utf-8`.
- `md/*.md` → servir chaque page aussi en Markdown à `<url>.md` (optionnel, recommandé par la spec llmstxt.org).
- `robots-ai.txt` → fusionner dans `robots.txt` (choisir Allow/Disallow pour les bots d'entraînement).
- `organization.jsonld` → compléter (logo, `sameAs` : LinkedIn, etc.) et injecter sur la page d'accueil.

> llms.txt n'est **pas** un facteur de classement Google (les porte-parole de Google Search ont indiqué ne pas l'utiliser) : il sert les assistants IA
> (ChatGPT, Claude, Perplexity, agents) qui lisent le site. Pour Google et ses AI Overviews, ce sont les
> bonnes pratiques SEO classiques qui comptent — voir `knowledge/seo-playbook.md`.

## Limites connues

- Crawl HTML sans rendu JavaScript : pour un site 100 % JS (SPA), compléter avec le skill `seo-firecrawl` ou `seo-visual`.
- Le crawler s'identifie honnêtement (`userAgent` du config) et respecte robots.txt ; les sites protégés par un anti-bot renvoient 403 et sont signalés « Bloqués » dans le rapport.
- Pas de volumes de recherche : brancher DataForSEO (skill `seo-dataforseo`) ou Search Console (`seo-google`) pour prioriser par la demande réelle.
- TTFB mesuré depuis la machine qui lance l'audit ; les Core Web Vitals réels viennent de CrUX / PageSpeed.

## Licence et attribution

- Code : MIT.
- `knowledge/google-search-docs/` : copie de la documentation [Google Search Central](https://developers.google.com/search), © Google, sous licence [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/) (exemples de code sous [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)). Convertie en Markdown ; chaque fichier indique sa page source et sa date de mise à jour. Ce repo n'est ni affilié à Google ni approuvé par Google.
