# Guide de déploiement — SD CREATIV

Ce document décrit la configuration du déploiement automatique via **GitHub Actions** et **Vercel**.

> **Production sur VPS Hostinger (`sdcreativ.fr`) :** voir le guide dédié [`DEPLOIEMENT-VPS-HOSTINGER.md`](./DEPLOIEMENT-VPS-HOSTINGER.md) (Nginx, PM2, PostgreSQL, fichier `.env`).

---

## Vue d'ensemble

| Workflow | Fichier | Déclencheur | Action |
|----------|---------|-------------|--------|
| **CI** | `.github/workflows/ci.yml` | Tous les push + pull requests | `lint` + `build` |
| **Deploy** | `.github/workflows/deploy.yml` | Push sur `main` ou `master` | `lint` + `build` puis déploiement Vercel |

Après configuration, **chaque push sur `main`** déploie automatiquement le site en production.

---

## Prérequis

- Compte [GitHub](https://github.com)
- Compte [Vercel](https://vercel.com)
- Dépôt GitHub contenant ce projet
- Node.js 20+ en local

---

## Étape 1 — Lier le projet à Vercel

Dans le dossier du projet :

```bash
cd /chemin/vers/sdcreativ
npx vercel link
```

Répondez aux questions :

| Question | Réponse recommandée |
|----------|---------------------|
| Set up and deploy? | **Yes** (première fois) ou link only si le projet existe déjà |
| Which scope? | Votre compte personnel ou votre équipe |
| Link to existing project? | **Yes** si déjà créé sur Vercel, **No** pour en créer un |
| Project name | `sdcreativ` (ou le nom de votre choix) |

Cela crée un dossier local `.vercel/` (ignoré par Git — ne pas committer).

---

## Étape 2 — Récupérer les IDs Vercel

```bash
cat .vercel/project.json
```

Exemple de contenu :

```json
{
  "orgId": "team_xxxxxxxx",
  "projectId": "prj_xxxxxxxx"
}
```

| Champ JSON | Secret GitHub correspondant |
|------------|----------------------------|
| `orgId` | `VERCEL_ORG_ID` |
| `projectId` | `VERCEL_PROJECT_ID` |

> **Important :** ces valeurs ne vont **pas** dans `.env.local` ni dans le code source. Elles servent uniquement aux secrets GitHub (étape 4).

---

## Étape 3 — Créer un token Vercel

1. Ouvrez [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Cliquez sur **Create Token**
3. Nom suggéré : `github-actions-sdcreativ`
4. Copiez le token immédiatement (il ne sera plus affiché)

Ce token correspond au secret GitHub **`VERCEL_TOKEN`**.

---

## Étape 4 — Configurer les secrets GitHub

1. Ouvrez votre dépôt sur GitHub
2. Allez dans **Settings → Secrets and variables → Actions**
3. Cliquez sur **New repository secret**
4. Ajoutez **3 secrets** :

| Nom du secret | Valeur à coller | Source |
|---------------|-----------------|--------|
| `VERCEL_TOKEN` | Token de l'étape 3 | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `team_xxxxxxxx` | Champ `orgId` de `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `prj_xxxxxxxx` | Champ `projectId` de `.vercel/project.json` |

Le workflow `.github/workflows/deploy.yml` consomme ces secrets automatiquement :

```yaml
env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## Étape 5 — Variables d'environnement sur Vercel

Dashboard Vercel → votre projet → **Settings → Environment Variables**

Ajoutez les variables suivantes pour l'environnement **Production** :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NEXT_PUBLIC_SITE_URL` | URL publique du site (SEO, sitemap) | `https://sdcreativ.com` |
| `NEXT_PUBLIC_CONTACT_PHONE` | Téléphone affiché | `+225 07 XX XX XX XX` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Email de contact | `contact@sdcreativ.com` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Numéro WhatsApp (chiffres uniquement) | `22507XXXXXXXX` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 (après consentement cookies) | `G-XXXXXXXXXX` |
| `OPENAI_API_KEY` | Assistant IA du site (optionnel, enrichit les réponses) | `sk-...` |
| `OPENAI_MODEL` | Modèle OpenAI pour le chatbot (défaut : gpt-4o-mini) | `gpt-4o-mini` |
| `NEXT_PUBLIC_GOOGLE_REVIEW_URL` | Lien Google Business (avis clients, schema SEO) | `https://g.page/r/VOTRE_ID/review` |
| `NEXT_PUBLIC_BOOKING_URL` | Prise de RDV Cal.com / Calendly (lien) | `https://cal.com/sdcreativ/30min` |
| `NEXT_PUBLIC_BOOKING_EMBED_URL` | Embed iframe RDV (optionnel) | `https://cal.com/sdcreativ/30min?embed=true` |
| `RESEND_API_KEY` | Clé API Resend (contact, devis, newsletter) | `re_xxxx` |
| `CONTACT_FROM_EMAIL` | Email expéditeur (domaine vérifié sur Resend) | `contact@sdcreativ.com` |
| `CONTACT_TO_EMAIL` | Email destinataire des demandes et rappels calendrier CRM | `contact@sdcreativ.com` |
| `CRON_SECRET` | Secret pour le cron des rappels calendrier (VPS production) | Chaîne aléatoire longue — voir section ci-dessous |
| `SANITY_PROJECT_ID` | CMS headless (blog & portfolio) | `abc123` |
| `SANITY_DATASET` | Dataset Sanity | `production` |
| `SANITY_API_TOKEN` | Token lecture Sanity | `sk...` |
| `NEXT_PUBLIC_SENTRY_DSN` | Monitoring erreurs Sentry | `https://...@sentry.io/...` |
| `ADMIN_SECRET` | Accès CRM interne `/admin/crm` | Mot de passe fort |
| `DATABASE_URL` | PostgreSQL — leads CRM | `postgresql://user:postgres@localhost:5432/sdcreativ` |
| `AWS_REGION` | Région bucket S3 documents | `eu-west-1` |
| `AWS_ACCESS_KEY_ID` | Clé IAM S3 (espace client) | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Secret IAM S3 | — |
| `AWS_S3_BUCKET` | Nom du bucket documents | `sdcreativ-documents-prod` |
| `CLIENT_PORTAL_TOKENS` | Accès + profil espace client (JSON) | Voir exemple ci-dessous |

Sans `RESEND_API_KEY`, le formulaire de contact, le configurateur de devis, la newsletter et les **rappels calendrier par email** loguent les demandes en console (ou échouent silencieusement pour le cron).

> **Configuration Resend pas à pas (DNS Hostinger, boîte mail, tests) :** [`RESEND-EMAIL.md`](./RESEND-EMAIL.md)

Sans variables AWS S3, l'API `/api/documents` répond `503` (voir [`docs/AWS-DOCUMENTS.md`](./AWS-DOCUMENTS.md)).

**Profils espace client** — deux formats dans `CLIENT_PORTAL_TOKENS` :

```bash
# Token seul (profil par défaut)
{"acme-corp":"token-secret-min-8-caracteres"}

# Profil personnalisé par client
{"acme-corp":{"token":"token-secret","name":"Marie N.","company":"Mode & Style","projectType":"E-commerce","progress":85,"totalAmount":1200000,"paidAmount":600000}}
```

Champs optionnels : `name`, `company`, `initials`, `projectTitle`, `projectType`, `projectStatus`, `progress`, `startDate`, `endDate`, `totalAmount`, `paidAmount`.

**Migration** depuis l’ancienne base `screativ` :

```bash
npm run db:migrate
```

Copie la table `leads` vers `sdcreativ` (doublons d’id ignorés). Variables optionnelles : `OLD_DATABASE_URL`, `NEW_DATABASE_URL`.

Sans `NEXT_PUBLIC_BOOKING_URL`, la prise de rendez-vous est masquée sur Contact et Tarifs.

Sans `OPENAI_API_KEY`, l'assistant IA fonctionne via la base de connaissances intégrée (services, tarifs, délais). Avec la clé, les réponses non reconnues sont enrichies par OpenAI.

### Rappels automatiques — calendrier CRM

Le CRM déclenche des rappels selon le **type d'événement** (réunions, appels, deadlines, etc.). Deux canaux coexistent :

| Canal | Quand | Prérequis |
|-------|-------|-----------|
| **In-app** | Toutes les ~45 s tant que le CRM est ouvert (`/admin/crm/*`) | `DATABASE_URL`, session admin |
| **Email** | Via cron externe (recommandé sur le **VPS Hostinger**) | `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CRON_SECRET` |

**Règles par défaut :**

| Type | Déclenchement |
|------|---------------|
| Réunion | 15 min avant |
| Appel | 10 min avant |
| Rappel | À l'heure prévue (9 h si journée entière) |
| Autre | 30 min avant |
| Deadline projet | Veille et jour J à 9 h |
| Échéance tâche | Veille à 17 h, jour J à 8 h |
| Relance devis | 1 h et 15 min avant |
| SLA ticket | 2 h et 30 min avant |

Les rappels déjà affichés ou envoyés sont enregistrés dans la table PostgreSQL `crm_reminder_logs` (créée par `npm run db:init` ou au premier accès API).

#### Configuration locale (dev)

Dans `.env.local` :

```bash
CRON_SECRET=dev-cron-secret-change-me
RESEND_API_KEY=re_xxxx          # optionnel en dev
CONTACT_TO_EMAIL=contact@sdcreativ.com
```

Test manuel du cron :

```bash
curl -s -H "Authorization: Bearer dev-cron-secret-change-me" \
  http://localhost:3000/api/cron/calendar-reminders
```

Réponse attendue : `{"sent":0,...}` ou `{"sent":N}` si des rappels sont dus.

#### Configuration production (VPS `sdcreativ.fr`)

1. Ajoutez `CRON_SECRET` dans le fichier `.env` du VPS (valeur **différente** de la dev).
2. Vérifiez `RESEND_API_KEY` et `CONTACT_TO_EMAIL` (emails regroupés vers cette adresse).
3. Planifiez un cron sur le serveur (toutes les 5 minutes) :

```cron
*/5 * * * * curl -s -H "Authorization: Bearer VOTRE_CRON_SECRET" https://sdcreativ.fr/api/cron/calendar-reminders >> /var/log/sdcreativ-cron.log 2>&1
```

> **Production Hostinger :** détail du `.env` VPS et du déploiement PM2 dans [`DEPLOIEMENT-VPS-HOSTINGER.md`](./DEPLOIEMENT-VPS-HOSTINGER.md).

Les notifications **in-app** (toasts + cloche du header) fonctionnent sans cron dès qu'un administrateur a le CRM ouvert. Le cron email couvre les cas où personne n'est connecté.

### Rapports planifiés par email

Route : `GET /api/cron/scheduled-reports` (même header `Authorization: Bearer CRON_SECRET`).

| Variable | Description |
|----------|-------------|
| `REPORT_CRON_RECIPIENTS` | Emails destinataires (séparés par des virgules) |
| `RESEND_API_KEY` | Envoi via Resend (sinon mode console) |

Exemple crontab hebdomadaire (lundi 8 h) :

```cron
0 8 * * 1 curl -s -H "Authorization: Bearer VOTRE_CRON_SECRET" https://sdcreativ.fr/api/cron/scheduled-reports >> /var/log/sdcreativ-reports.log 2>&1
```

### Flux calendrier iCal (Google / Outlook)

Abonnement en lecture seule : `GET /api/calendar/feed?token=ICAL_FEED_TOKEN`

| Variable | Description |
|----------|-------------|
| `ICAL_FEED_TOKEN` | Token secret du feed (sinon réutilise `CRON_SECRET`) |

Dans Paramètres CRM → section « Calendrier externe », l'URL complète est affichée.

---

## Étape 6 — Configuration locale (développement)

Pour le développement en local uniquement :

```bash
cp .env.example .env.local
```

Éditez `.env.local` avec vos valeurs. Ce fichier **ne doit jamais être commité** (déjà dans `.gitignore`).

Les IDs Vercel (`orgId`, `projectId`) et le token **ne vont pas** dans `.env.local`.

---

## Étape 7 — Pousser le code et déclencher le déploiement

```bash
git add .
git commit -m "Configure le déploiement automatique"
git push origin main
```

Le déploiement ne se déclenche que sur la branche **`main`** ou **`master`**.

---

## Étape 8 — Vérifier que tout fonctionne

### Sur GitHub

1. Onglet **Actions** de votre dépôt
2. Workflow **Deploy** → job **Lint & Build** doit être vert
3. Puis job **Deploy to Vercel** doit être vert

### Sur Vercel

1. Dashboard → votre projet → **Deployments**
2. Une nouvelle deployment **Production** doit apparaître
3. Cliquez dessus pour obtenir l'URL du site

---

## Déploiement manuel (optionnel)

Pour tester Vercel avant ou sans GitHub Actions :

```bash
# Preview (URL temporaire)
npx vercel

# Production
npx vercel --prod
```

---

## Où mettre quoi — récapitulatif

| Élément | Emplacement | Commité sur Git ? |
|---------|-------------|-------------------|
| `orgId` / `projectId` | Secrets GitHub (`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) | Non |
| Token Vercel | Secret GitHub (`VERCEL_TOKEN`) | Non |
| `.vercel/project.json` | Local uniquement | Non (`.gitignore`) |
| `.env.local` | Local uniquement | Non (`.gitignore`) |
| Variables de prod | Dashboard Vercel → Environment Variables (preview/staging) ou `.env` sur le VPS (production `sdcreativ.fr`) | Non |
| `CRON_SECRET` | `.env` VPS + crontab serveur (rappels calendrier email) | Non |
| Workflows CI/CD | `.github/workflows/` | Oui |

---

## Dépannage

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| `Invalid token` | `VERCEL_TOKEN` incorrect ou expiré | Recréer un token sur Vercel et mettre à jour le secret GitHub |
| `Project not found` | Mauvais `VERCEL_ORG_ID` ou `VERCEL_PROJECT_ID` | Relancer `npx vercel link` et vérifier `cat .vercel/project.json` |
| Build OK en local, échec en CI | Variable manquante sur Vercel | Vérifier **Settings → Environment Variables → Production** |
| Aucun déploiement déclenché | Push sur une autre branche | Merger ou pousser sur `main` / `master` |
| Formulaire contact sans email | `RESEND_API_KEY` absent | Ajouter la clé sur Vercel et vérifier le domaine expéditeur sur [resend.com](https://resend.com) |
| Rappels calendrier sans email | `CRON_SECRET` ou `RESEND_API_KEY` absent sur le VPS | Ajouter les variables dans `.env`, configurer le crontab (voir section rappels calendrier) |
| Cron rappels `401 Non autorisé` | Mauvais `Authorization: Bearer` | Vérifier que le secret du crontab correspond exactement à `CRON_SECRET` dans `.env` |
| Rappels in-app absents | CRM fermé ou pas connecté | Normal : les toasts ne s'affichent que sur `/admin/crm/*` avec session admin active |
| Analytics inactif | `NEXT_PUBLIC_GA_MEASUREMENT_ID` absent | Créer une propriété GA4 et ajouter l'ID sur Vercel |
| Avis Google invisibles | `NEXT_PUBLIC_GOOGLE_REVIEW_URL` absent | Récupérer le lien « Laisser un avis » depuis Google Business Profile et l'ajouter sur Vercel |
| Bandeau cookies réapparaît | Stockage local effacé | Comportement normal — le consentement est stocké dans le navigateur |

---

## Domaine personnalisé (optionnel)

1. Vercel Dashboard → projet → **Settings → Domains**
2. Ajoutez votre domaine (ex. `sdcreativ.com`)
3. Configurez les DNS chez votre registrar selon les instructions Vercel
4. Mettez à jour `NEXT_PUBLIC_SITE_URL` sur Vercel avec l'URL finale

---

## Support

- Documentation Vercel : [vercel.com/docs](https://vercel.com/docs)
- Documentation GitHub Actions : [docs.github.com/actions](https://docs.github.com/actions)
