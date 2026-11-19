---
title: "{{Title SEO — ≤ 60 caractères, requête principale au début, unique}}"
description: "{{Meta description 120–155 caractères : bénéfice concret + élément différenciant}}"
slug: "{{slug-court-en-minuscules}}"
author: "{{Prénom Nom}}"
author_url: "{{/auteurs/prenom-nom}}"
date_published: "{{AAAA-MM-JJ}}"
date_modified: "{{AAAA-MM-JJ}}"
cluster: "{{cluster}}"
primary_query: "{{requête}}"
canonical: "{{https://site.com/blog/slug}}"
---

# {{H1 — formulation naturelle, peut différer du title}}

{{Chapeau (2-4 phrases) : pour qui, quel problème, ce que le lecteur saura faire à la fin.
Affichez la date de mise à jour et l'auteur de façon visible.}}

## {{Question principale reformulée}}

{{Réponse directe d'abord : le lecteur doit avoir l'essentiel en quelques phrases
(définition, chiffre, conclusion), puis le détail. Écrire pour l'humain, pas « pour l'IA ».}}

## {{H2 suivant}}

{{Contenu. Paragraphes courts, listes et tableaux quand ils aident vraiment.}}

| Critère | Option A | Option B |
|---|---|---|
| {{…}} | {{…}} | {{…}} |

## Questions fréquentes

<!-- Utile aux lecteurs. Pas de balisage FAQPage : rich result déprécié par Google (mai 2026). -->

### {{Question réelle ?}}

{{Réponse en 2-4 phrases.}}

## À retenir

- {{point clé 1}}
- {{point clé 2}}

{{CTA contextuel}}

<!-- Données structurées à injecter dans <head> -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{{H1}}",
  "description": "{{meta description}}",
  "image": ["{{https://site.com/images/hero.webp}}"],
  "datePublished": "{{AAAA-MM-JJ}}",
  "dateModified": "{{AAAA-MM-JJ}}",
  "author": { "@type": "Person", "name": "{{Prénom Nom}}", "url": "{{https://site.com/auteurs/prenom-nom}}" },
  "publisher": { "@id": "{{https://site.com/#organization}}" },
  "mainEntityOfPage": "{{canonical}}"
}
</script>
