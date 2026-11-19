# SEO Playbook — synthèse de la documentation Google Search (état au 19 novembre 2026)

Synthèse actionnable, en français, de la copie locale de Google Search Central (`google-search-docs/`,
dernière entrée du journal des mises à jour : **18 novembre 2026**). Chaque règle renvoie au fichier source.
En cas de doute, la page source fait foi — et relancer `npm run google-docs` avant un gros chantier.

---

## 1. Ce qui a changé récemment (2025 → nov. 2026)

| Date | Changement | Conséquence pour nous | Source |
|---|---|---|---|
| mai 2026 | **Nouveau guide officiel « Optimizing for generative AI features »** : le SEO classique *est* l'optimisation pour AI Overviews / AI Mode. Contenu « non-commodity » = levier n°1. | Pas de « hacks GEO ». On investit dans le contenu original. | [ai-optimization-guide](google-search-docs/docs/fundamentals/ai-optimization-guide.md) |
| mai 2026 | Le site doit être **inclus dans les fonctionnalités IA génératives dans Search Console** pour être éligible aux AI Overviews / AI Mode. | Vérifier ce réglage dans Search Console (non détectable par crawl). | idem |
| mai 2026 | Les **règles anti-spam s'appliquent aussi aux réponses IA** de Google. | Pas de contenu de masse pour « nourrir » les IA. | [updates](google-search-docs/updates.md) |
| mai → juin 2026 | **Fin des résultats enrichis FAQ** (plus affichés depuis le 7 mai 2026, doc retirée en juin). | Le balisage `FAQPage` n'apporte plus rien dans Google. Les sections FAQ restent utiles aux lecteurs. | [updates](google-search-docs/updates.md) |
| juin 2026 | **llms.txt** : Google Search ne l'utilise pas — ni bonus ni malus. Libre d'en maintenir pour d'autres services. | On garde llms.txt pour ChatGPT/Claude/Perplexity/agents, sans en attendre d'effet sur Google. | [ai-optimization-guide § Mythbusting](google-search-docs/docs/fundamentals/ai-optimization-guide.md) |
| juin 2026 | Guide sur les **outils, services et conseils SEO tiers** : aucun outil n'a accès aux données internes de Google. | Recouper nos rapports avec Search Console. | [third-party-seo](google-search-docs/docs/fundamentals/third-party-seo.md) |
| avr. 2026 | Nouvelle règle anti-spam **« back button hijacking »** (manipuler le bouton retour). | Aucun script qui intercepte le retour arrière. | [spam-policies](google-search-docs/docs/essentials/spam-policies.md) |
| 2026 | **Preferred sources** (sources préférées) : disponible dans toutes les langues pour Top Stories, puis dans AI Mode / AI Overviews ; bouton officiel intégrable. | Si le site publie de l'actualité : ajouter le bouton « source préférée ». | [preferred-sources](google-search-docs/docs/appearance/preferred-sources.md) |
| août 2026 | **Site reputation policy** mise à jour (application adaptée dans l'EEE). | Ne pas héberger de contenu tiers sans contrôle éditorial. | [spam-policies § Site reputation](google-search-docs/docs/essentials/spam-policies.md) |
| oct. 2026 | **Contenu généré par IA** : guide aligné sur les Quality Rater Guidelines (sections 4.6.5 et 4.6.6 : contenu de masse, contenu sans effort ni originalité). | Toute assistance IA = relecture humaine, vérification des faits, valeur ajoutée. | [using-gen-ai-content](google-search-docs/docs/fundamentals/using-gen-ai-content.md) |
| oct. 2026 | Structure d'URL : tirets plutôt qu'underscores pour séparer les mots. | Slugs en `mots-separes-par-tirets`. | [crawling-indexing](google-search-docs/docs/crawling-indexing/) |
| déc. 2025 | Ajout des **« smaller core updates »** ; précisions JavaScript (noindex, canonical, codes non-200). | Ne pas injecter `noindex`/canonical en JS de façon contradictoire. | [core-updates](google-search-docs/docs/appearance/core-updates.md) |

## 2. Les principes qui pilotent tout

1. **People-first, non-commodity.** Le contenu doit apporter une information, une expérience ou une analyse
   qu'on ne trouve pas déjà partout. Exemple de contenu « commodity » cité par Google : « 7 conseils pour
   les primo-accédants ». → Chaque brief doit remplir la rubrique *gain d'information*.
   ([creating-helpful-content](google-search-docs/docs/fundamentals/creating-helpful-content.md), [ai-optimization-guide](google-search-docs/docs/fundamentals/ai-optimization-guide.md))
2. **E-E-A-T** (expérience, expertise, autorité, fiabilité) : qui a écrit, comment, pourquoi. Auteur visible,
   bio, preuves d'expérience de première main, sources.
3. **Pas de contenu de masse.** Créer une page par variante de requête (ou par requête « fan-out ») pour manipuler
   le classement ou les réponses IA = *scaled content abuse*. Le backlog sert à choisir, pas à tout publier.
   ([spam-policies § Scaled content abuse](google-search-docs/docs/essentials/spam-policies.md))
4. **Pas de « chunking » ni de réécriture « pour l'IA ».** Google comprend les synonymes et les pages multi-sujets.
   Écrire pour le lecteur, avec des sections et des titres clairs. Il n'y a pas de longueur idéale.
5. **La technique d'abord** : une page doit être indexée et éligible à un snippet pour apparaître dans les
   AI Overviews / AI Mode. Aucune exigence technique supplémentaire.
   ([ai-features](google-search-docs/docs/appearance/ai-features.md), [technical requirements](google-search-docs/docs/essentials/))

## 3. Technique (vérifié par `npm run audit`)

- **Crawl** : robots.txt autorise Googlebot (et le CDN/hébergeur ne bloque pas). Sitemap XML déclaré dans robots.txt.
- **Indexation** : pas de `noindex` involontaire, canonical cohérente (auto-référente sur les pages à indexer),
  pas de contenu dupliqué inutile, redirections 301 propres, pas de chaînes.
- **Liens** : liens `<a href>` crawlables, chaque page importante reçoit des liens internes avec des ancres descriptives.
- **Page experience** : mobile, HTTPS, Core Web Vitals (LCP, INP, CLS), pas d'interstitiels intrusifs,
  contenu principal clairement distinct du reste. ([page-experience](google-search-docs/docs/appearance/page-experience.md), [core-web-vitals](google-search-docs/docs/appearance/core-web-vitals.md))
- **JavaScript** : contenu important présent dans le HTML rendu ; ne pas changer `noindex`/canonical en JS.
- **URL** : courtes, lisibles, mots séparés par des tirets.
- **Search Console** : site vérifié, sitemap soumis, *inclusion dans les fonctionnalités IA génératives* activée,
  suivi du rapport « Generative AI performance ».

## 4. Apparence dans les résultats

- **Title** (`<title>`) : unique, descriptif, concis, sans bourrage de mots-clés ; la marque à la fin si besoin.
  Google peut le réécrire s'il est trop long, générique ou différent du H1. ([title-link](google-search-docs/docs/appearance/title-link.md))
- **Meta description** : unique par page, résume la page de façon spécifique ; Google peut utiliser un extrait du contenu à la place. ([snippet](google-search-docs/docs/appearance/snippet.md))
- **Dates** : date de publication / mise à jour visible sur la page **et** cohérente avec `datePublished`/`dateModified`. ([publication-dates](google-search-docs/docs/appearance/publication-dates.md))
- **Nom du site / favicon / fil d'Ariane** : `WebSite` (nom du site), favicon conforme, `BreadcrumbList`. ([site-names](google-search-docs/docs/appearance/site-names.md), [favicon-in-search](google-search-docs/docs/appearance/favicon-in-search.md))
- **Images** : images originales de qualité, `alt` descriptif, près du texte pertinent, formats modernes. ([google-images](google-search-docs/docs/appearance/google-images.md))
- **Contrôle des extraits** : `nosnippet`, `data-nosnippet`, `max-snippet` s'appliquent aussi aux fonctionnalités IA.

## 5. Données structurées (JSON-LD)

Utiles pour les résultats enrichis ; **pas** requises ni spéciales pour l'IA. Le balisage doit correspondre au contenu visible. ([sd-policies](google-search-docs/docs/appearance/structured-data/sd-policies.md))

| Type | Où | Statut nov. 2026 |
|---|---|---|
| `Organization` + `WebSite` | accueil | recommandé (logo, nom de site, coordonnées) — [organization](google-search-docs/docs/appearance/structured-data/organization.md) |
| `Article` / `BlogPosting` | articles | recommandé — [article](google-search-docs/docs/appearance/structured-data/article.md) |
| `BreadcrumbList` | toutes pages | recommandé — [breadcrumb](google-search-docs/docs/appearance/structured-data/breadcrumb.md) |
| `ProfilePage` | pages auteur | recommandé pour l'E-E-A-T — [profile-page](google-search-docs/docs/appearance/structured-data/profile-page.md) |
| `LocalBusiness` | si activité locale | + Google Business Profile — [local-business](google-search-docs/docs/appearance/structured-data/local-business.md) |
| `Product`, `MerchantReturnPolicy`, `ShippingService` | e-commerce | + Merchant Center — [product](google-search-docs/docs/appearance/structured-data/product.md), [shipping-policy](google-search-docs/docs/appearance/structured-data/shipping-policy.md) |
| `Review` / `AggregateRating` | avis authentiques | respecter les règles d'auto-avis — [review-snippet](google-search-docs/docs/appearance/structured-data/review-snippet.md) |
| `VideoObject` | vidéos | ajout de `creator` en sept. 2026 — [video](google-search-docs/docs/appearance/structured-data/video.md) |
| ~~`FAQPage`~~ | — | **déprécié** (plus de rich result depuis le 7 mai 2026) |
| ~~`HowTo`~~ | — | retiré (plus documenté) |

## 6. Interdits (spam policies)

Cloaking · doorway pages · expired domain abuse · texte/liens cachés · bourrage de mots-clés · achat/échange
de liens (link spam) · trafic artificiel · pratiques malveillantes (dont *back button hijacking*) · fonctionnalités
trompeuses · **scaled content abuse** · scraping/republication · **site reputation abuse** · redirections
trompeuses · affiliation mince · spam UGC. Ces règles s'appliquent aussi aux réponses IA de Google.
([spam-policies](google-search-docs/docs/essentials/spam-policies.md))

Et selon Google, inutile pour Google Search : llms.txt, balisage « spécial IA », découper le contenu en
morceaux, réécrire pour l'IA, chercher des mentions inauthentiques.

## 7. Moteurs IA hors Google (ChatGPT, Claude, Perplexity, Copilot)

Les leviers sont les mêmes (contenu original, accessible, bien structuré), avec quelques spécificités :

- **Accès** : autoriser leurs robots de recherche dans robots.txt (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `Bingbot`
  — ChatGPT et Copilot s'appuient en partie sur l'index Bing → **soumettre le sitemap à Bing Webmaster Tools / IndexNow**).
- **Contenu en HTML** (pas seulement en JS) : la plupart de ces robots n'exécutent pas JavaScript.
- **llms.txt / llms-full.txt / pages .md** : facilitent la lecture par les assistants et agents (généré par `npm run llms`).
- **Entité claire** : nom, description, `sameAs` cohérents partout (site, LinkedIn, annuaires, Google Business Profile).

## 8. Checklist avant publication d'un article

**Contenu**
- [ ] Répond à une intention précise ; le lecteur repart satisfait sans devoir chercher ailleurs.
- [ ] Gain d'information explicite (donnée interne, test, cas client, tarif réel, avis d'expert nommé).
- [ ] Pas un résumé de ce qui existe déjà ; pas de « commodity content ».
- [ ] Faits vérifiés, sources citées ; toute aide IA relue et corrigée par un humain.
- [ ] Auteur réel avec bio et page auteur ; date de publication / mise à jour visible.

**On-page**
- [ ] `<title>` unique, ≤ ~60 caractères ; H1 unique et cohérent avec le title.
- [ ] Meta description unique et spécifique.
- [ ] Structure H2/H3 lisible ; réponse claire tôt dans chaque section importante.
- [ ] 3–8 liens internes contextuels (pilier ↔ satellites) ; liens sortants vers des sources fiables.
- [ ] Images originales, `alt`, `width`/`height`, format WebP/AVIF, `loading="lazy"` sous la ligne de flottaison.
- [ ] URL courte avec tirets ; canonical auto-référente.

**Technique**
- [ ] JSON-LD `BlogPosting` + `BreadcrumbList` valides (Rich Results Test) et conformes au contenu visible.
- [ ] Page dans le sitemap, indexable, rendue sans JS bloquant.
- [ ] Après publication : inspection d'URL dans Search Console, `npm run llms` pour mettre à jour llms.txt.
