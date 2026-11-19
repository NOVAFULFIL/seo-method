# CLAUDE.md — comment piloter la méthode SEO

Ce repo implémente une méthode SEO en 5 étapes. Les scripts collectent les données ;
Claude fait l'analyse, la priorisation et la rédaction en s'appuyant **uniquement** sur
`knowledge/` pour les règles Google (pas sur sa mémoire).

## Avant tout

1. `config/project.json` doit exister (copie de `config/project.example.json`).
2. `npm install` une fois.
3. Vérifier la fraîcheur de `knowledge/google-search-docs/manifest.json` (`fetchedAt`).
   Si > 30 jours : `npm run google-docs`.

## Étape 1 — Audit du site

`npm run audit` → `reports/<domaine>/audit.md`, `audit.json`, `pages.csv`, `pages.json`.

Ensuite, Claude :
- résume les 10 actions techniques prioritaires (impact × effort) dans `reports/<domaine>/plan-technique.md` ;
- relie chaque recommandation à la page de doc Google correspondante dans `knowledge/google-search-docs/` ;
- vérifie les signaux terrain si dispo (skill `seo-google` : Search Console, CrUX, PageSpeed).

## Étape 2 — Concurrents & backlog

`npm run competitors` → `reports/competitors/competitors.md`, `articles.json`, `clusters.json`, `article-backlog.csv`.

Ensuite, Claude :
- lit `articles.json` (titres + H2 de chaque article concurrent) et **réécrit** les clusters en vrais sujets
  (le clustering par n-grammes est un premier tri, pas une vérité) ;
- qualifie chaque idée : colonne `infoGain` remplie (sinon `decision = écarté`), puis élargit le backlog : pour chaque cluster, ajoute les angles absents chez les concurrents, les questions
  « People also ask », les requêtes longue traîne et les pages comparatives/prix ;
- produit `reports/content-plan.md` : clusters → page pilier + satellites, intention, priorité, maillage interne ;
- si un concurrent est marqué « Bloqués » (403), compléter via le skill `seo-firecrawl` ou `seo-dataforseo`.
  Ne jamais contourner une protection anti-bot (pas d'usurpation de user-agent).

## Étape 3 — Règles Google à jour

`knowledge/google-search-docs/` = copie Markdown de Google Search Central (EN).
`knowledge/seo-playbook.md` = synthèse actionnable en français, avec liens vers les pages sources.
Toute règle citée dans un brief ou un article doit pouvoir pointer vers un fichier de `knowledge/`.

## Étape 4 — Rédaction d'articles

Pour chaque ligne du backlog retenue :
1. Brief avec `templates/article-brief.md` → `content/briefs/<slug>.md`.
2. Article avec `templates/article.md` → `content/articles/<slug>.md`.
3. Contrôle avec la checklist de `knowledge/seo-playbook.md` (section « Checklist avant publication »)
   et, au besoin, le skill `seo-content`.

Règles non négociables :
- contenu écrit pour des humains, avec un gain d'information réel (données, expérience, avis d'expert) ;
- jamais de production en masse de pages sans valeur (« scaled content abuse ») ;
- auteur réel, dates visibles, sources citées ;
- une réponse claire tôt dans chaque section importante, écrite pour le lecteur (Google déconseille de « découper » ou réécrire le contenu spécialement pour l'IA) ;
- pas de FAQPage en JSON-LD (rich result déprécié depuis mai 2026) — les sections FAQ restent utiles aux lecteurs.

## Étape 5 — Fichiers LLM

`npm run llms` → `reports/<domaine>/llm/` : `llms.txt`, `llms-full.txt`, `md/`, `robots-ai.txt`, `organization.jsonld`.
À déployer à la racine du site (voir README). À régénérer après chaque vague de publication.
