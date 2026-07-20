# CMS headless — Sanity

Le site utilise une **couche CMS** (`src/lib/cms/`) avec repli automatique sur les fichiers statiques `src/content/` si Sanity n'est pas configuré.

## Configuration

1. Créez un projet sur [sanity.io](https://www.sanity.io)
2. Ajoutez les variables sur Vercel / `.env.local` :

```bash
SANITY_PROJECT_ID=votre_project_id
SANITY_DATASET=production
SANITY_API_VERSION=2024-01-01
SANITY_API_TOKEN=votre_token_lecture
```

3. Redéployez — le blog et le portfolio seront alimentés par Sanity dès qu'au moins un document est publié.

## Schémas recommandés

### `post` (blog)

| Champ | Type |
|-------|------|
| `slug` | slug |
| `title` | string |
| `excerpt` | text |
| `category` | string |
| `date` | date |
| `readTime` | string |
| `content` | array of text |

### `project` (réalisation)

Reprend la structure `Realisation` de `src/content/realisations.ts` : `id`, `title`, `client`, `sector`, `location`, `year`, `duration`, `category`, `description`, `tags`, `stack`, `image`, `imageAlt`, `accent`, `metric`, `featured`, `caseStudy`, `testimonial`, `beforeAfter`.

## Requêtes GROQ

Voir `src/lib/cms/sanity.ts`.

## Alternative Strapi

La même couche `src/lib/cms/index.ts` peut être étendue avec un provider Strapi. Sanity est recommandé pour Next.js + Vercel (CDN, GROQ, faible latence).
