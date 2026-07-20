# Déploiement production — sdcreativ.com (Hostinger KVM4)

Guide pas à pas pour mettre en ligne **SD CREATIV** sur un VPS Hostinger avec le domaine **`sdcreativ.com`**.

**Stack :** Docker Compose — Next.js (site public + CRM `/admin` + API `/api/*`) + PostgreSQL + Redis + Nginx + Certbot SSL.

> Guide technique détaillé de la stack : [`DOCKER-PRODUCTION.md`](./DOCKER-PRODUCTION.md)  
> Checklist après déploiement : [`VPS-POST-DEPLOIEMENT.md`](./VPS-POST-DEPLOIEMENT.md)  
> **Site en ligne — commandes au quotidien :** [`OPERATIONS-VPS.md`](./OPERATIONS-VPS.md)  
> **Sécurité VPS (pare-feu, SSH, sauvegardes) :** [`VPS-SECURITE.md`](./VPS-SECURITE.md)  
> **Déploiement auto (runner self-hosted) :** [`GITHUB-ACTIONS-RUNNER.md`](./GITHUB-ACTIONS-RUNNER.md)

---

## Architecture

```
Internet :443 / :80
       ↓
   Nginx (SSL, reverse proxy)
       ↓
   Next.js app :3000 (réseau Docker interne)
       ├── Site public (pages, blog, contact)
       ├── CRM /admin/crm
       └── API /api/*
       ↓
   PostgreSQL 16  +  Redis 7

Certbot → renouvellement Let's Encrypt automatique
```

| Composant | Rôle en production |
|-----------|-------------------|
| **app** | Monolithe Next.js — pas de port exposé sur l'hôte |
| **postgres** | Base CRM + blog — accessible uniquement sur le réseau Docker |
| **redis** | Cache / sessions — réseau interne |
| **nginx** | Seul point d'entrée public (`:80`, `:443`) |
| **certbot** | Obtention et renouvellement SSL |

Les fichiers CRM (factures, documents clients) sont stockés sur **AWS S3** si `AWS_*` est configuré dans `.env.docker`. Les uploads blog locaux sont dans le volume / dossier `public/uploads/`.

---

## Prérequis

- VPS **KVM4** Hostinger (Ubuntu 22.04 ou 24.04)
- Domaine **`sdcreativ.com`** géré chez Hostinger
- Accès **SSH** root ou sudo
- Repo Git (GitHub ou clone direct sur le serveur)
- Comptes / clés prêts : **Resend** (emails), **Sanity** (CMS), **AWS S3** (documents CRM, sauvegardes)

---

## Étape 1 — DNS Hostinger

**hPanel → Domaines → sdcreativ.com → Zone DNS**

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| **A** | `@` | IP publique du VPS | 300 |
| **A** | `www` | IP publique du VPS | 300 |

Récupérer l'IP : hPanel → VPS → votre serveur → **Adresse IP**.

Vérifier la propagation (depuis votre machine, attendre 5–30 min) :

```bash
dig sdcreativ.com +short
dig www.sdcreativ.com +short
```

Les deux commandes doivent renvoyer **la même IP** que le VPS.

> **Important :** le certificat SSL ne pourra pas être obtenu tant que le DNS ne pointe pas vers le VPS. Lancez le déploiement SSL **uniquement après** cette vérification.

---

## Étape 2 — Préparer le VPS

### Connexion SSH

```bash
ssh root@VOTRE_IP_VPS
```

### Docker et pare-feu

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y git ufw gettext-base   # gettext-base = envsubst (Nginx)
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

> Pare-feu **Hostinger** (hPanel), durcissement SSH, fail2ban et sauvegardes : [`VPS-SECURITE.md`](./VPS-SECURITE.md).

### Cloner le projet

```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/VOTRE_ORG/sdcreativ.git
cd sdcreativ
chmod +x scripts/*.sh docker/certbot/init-letsencrypt.sh
```

---

## Étape 3 — Fichiers de configuration

Deux fichiers distincts : **`.env`** (Compose + SSL) et **`.env.docker`** (secrets application).

### `.env` — Compose, domaine, PostgreSQL, Certbot

```bash
cat > .env << 'EOF'
POSTGRES_USER=sdcreativ
POSTGRES_PASSWORD=CHANGE_ME_MOT_DE_PASSE_FORT
POSTGRES_DB=sdcreativ
POSTGRES_PORT=5433
APP_PORT=3001

DOMAIN=sdcreativ.com
CERTBOT_EMAIL=admin@sdcreativ.com
CERTBOT_STAGING=0
EOF
```

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Mot de passe fort — **identique** dans `DATABASE_URL` (voir ci-dessous) |
| `DOMAIN` | Domaine principal sans `https://` |
| `CERTBOT_EMAIL` | Email pour Let's Encrypt (alertes expiration) |
| `CERTBOT_STAGING=1` | Test SSL sans quota LE — remettre `0` pour la prod réelle |

### `.env.docker` — Secrets conteneur `app`

```bash
cp .env.docker.example .env.docker
nano .env.docker
```

**Synchroniser le mot de passe PostgreSQL** — remplacez `CHANGE_ME` par la même valeur que `POSTGRES_PASSWORD` dans `.env` :

```env
DATABASE_URL=postgresql://sdcreativ:CHANGE_ME_MOT_DE_PASSE_FORT@postgres:5432/sdcreativ
```

> Ne mettez **pas** `DATABASE_URL=...@postgres` dans `.env` : Next.js le chargerait en dev local et casserait la connexion.

#### Variables indispensables en production

| Variable | Valeur / remarque |
|----------|-------------------|
| `NEXT_PUBLIC_SITE_URL` | `https://sdcreativ.com` (mis à jour auto par `docker-prod-deploy.sh`) |
| `ADMIN_SECRET` | Chaîne longue aléatoire — **mot de passe CRM** au 1er login |
| `DATABASE_URL` | `postgresql://sdcreativ:MOT_DE_PASSE@postgres:5432/sdcreativ` |
| `REDIS_URL` | `redis://redis:6379` |
| `RESEND_API_KEY` | Clé API Resend |
| `CONTACT_FROM_EMAIL` | `contact@sdcreativ.com` (domaine vérifié sur Resend) |
| `CONTACT_TO_EMAIL` | Adresse où vous recevez les demandes |
| `CRON_SECRET` | Secret pour les routes `/api/cron/*` (≠ `ADMIN_SECRET`) |

#### Variables recommandées

| Variable | Rôle |
|----------|------|
| `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_TOKEN` | Contenu CMS |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` | Documents CRM + uploads |
| `AWS_S3_BACKUP_PREFIX` | Préfixe S3 des sauvegardes (`backups/sdcreativ/`) |
| `CRM_BOOTSTRAP_EMAIL` | Email admin créé au 1er login (défaut : `admin@sdcreativ.com`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Monitoring erreurs (optionnel) |

Reprendre les valeurs depuis votre `.env.local` / `.env.docker` de développement (Sanity, AWS, Resend, etc.).

---

## Étape 4 — Pré-vol

```bash
./scripts/docker-preflight.sh
```

Le script contrôle :

- Présence de `.env` et `.env.docker`
- `DOMAIN`, `CERTBOT_EMAIL`, `ADMIN_SECRET`, `DATABASE_URL`
- Syntaxe `docker compose config` (profile prod)
- Résolution DNS de `sdcreativ.com`

Corrigez toutes les **erreurs** (✗) avant de continuer. Les **avertissements** (⚠) peuvent être traités après le premier déploiement (ex. Resend pas encore configuré).

---

## Étape 5 — Déploiement SSL + Docker

### Alias Compose (toutes les commandes prod)

```bash
export COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod"
```

> En production, n'utilisez **pas** `docker-compose.override.yml` (réservé au dev local).

### Test SSL staging (recommandé la 1ère fois)

Sans consommer le quota Let's Encrypt :

```bash
CERTBOT_STAGING=1 ./scripts/docker-prod-deploy.sh
```

Vérifier que Nginx et l'app répondent (certificat non reconnu par le navigateur — normal).

### Production réelle

```bash
# Remettre CERTBOT_STAGING=0 dans .env
./scripts/docker-prod-deploy.sh
```

Le script :

1. Relance le pré-vol
2. Aligne `NEXT_PUBLIC_SITE_URL=https://sdcreativ.com` dans `.env.docker`
3. Build l'image Next.js
4. Obtient le certificat Let's Encrypt pour `sdcreativ.com` et `www.sdcreativ.com`
5. Démarre Nginx, app, Postgres, Redis, Certbot

Comportement Nginx :

- `http://` → redirection **301** vers `https://sdcreativ.com`
- `https://www.sdcreativ.com` → redirection **301** vers `https://sdcreativ.com`

---

## Étape 6 — Premier accès CRM

1. Ouvrir **https://sdcreativ.com/admin/login**
2. Se connecter avec :
   - **Email :** valeur de `CRM_BOOTSTRAP_EMAIL` (défaut `admin@sdcreativ.com`)
   - **Mot de passe :** valeur de `ADMIN_SECRET` (mot de passe temporaire de déploiement)
3. À la première connexion, l’application vous demande de **choisir un mot de passe personnel** (page « Mon compte »).
4. Ensuite, connectez-vous avec votre email et ce nouveau mot de passe. `ADMIN_SECRET` ne sert plus qu’aux secrets serveur (sessions, cookies).

> Le compte admin **n’est pas** inséré au déploiement Docker seul : il est créé au **premier démarrage de l’app** (ou au premier login). Sur le VPS, si la table `crm_users` est vide :
>
> ```bash
> ./scripts/bootstrap-crm-admin.sh
> ```

---

## Étape 7 — Vérifications

### Automatique

```bash
./scripts/vps-post-deploy-check.sh
```

### Manuelle

```bash
curl -I https://sdcreativ.com
curl -I http://sdcreativ.com          # → 301 vers HTTPS
$COMPOSE ps
```

Checklist :

- [ ] https://sdcreativ.com — page d'accueil **200**
- [ ] https://sdcreativ.com/admin/login — CRM accessible
- [ ] https://sdcreativ.com/blog/feed.xml — flux RSS **200**
- [ ] Formulaire contact → email reçu (après config Resend)
- [ ] `ADMIN_SECRET` et `POSTGRES_PASSWORD` **changés** (plus de valeurs par défaut)
- [ ] `CRON_SECRET` différent de `ADMIN_SECRET`

---

## Étape 8 — Emails (Resend)

1. [resend.com](https://resend.com) → **Domains → Add** → `sdcreativ.com`
2. Copier les enregistrements **SPF / DKIM** dans la zone DNS Hostinger (`sdcreativ.com`)
3. Attendre le statut **Verified**
4. Dans `.env.docker` :

   ```env
   RESEND_API_KEY=re_...
   CONTACT_FROM_EMAIL=contact@sdcreativ.com
   CONTACT_TO_EMAIL=votre-email@...
   ```

5. Redémarrer l'app :

   ```bash
   $COMPOSE up -d --build app
   ```

6. Tester le formulaire contact sur https://sdcreativ.com/contact

> L'ancien guide [`RESEND-EMAIL.md`](./RESEND-EMAIL.md) mentionne encore `sdcreativ.fr` — appliquez la même procédure avec **`sdcreativ.com`**.

---

## Étape 9 — Sauvegardes automatiques

### Sauvegarde manuelle (PostgreSQL + uploads blog)

```bash
BACKUP_DIR=/var/backups/sdcreativ \
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml" \
./scripts/db-backup.sh
```

Fichiers créés : `sdcreativ-YYYYMMDD-HHMMSS.dump` (+ archive uploads si présents).

### Cron quotidien sur le VPS

```bash
sudo BACKUP_DIR=/var/backups/sdcreativ ./scripts/install-backup-cron.sh
```

### Upload S3 (optionnel, recommandé)

Si `AWS_*` et `AWS_S3_BACKUP_PREFIX=backups/sdcreativ` sont définis dans `.env.docker`, `db-backup.sh` envoie automatiquement les dumps vers S3.

Restauration : voir [`VPS-POST-DEPLOIEMENT.md`](./VPS-POST-DEPLOIEMENT.md) (`db-restore.sh`).

---

## Étape 10 — Crons métier (optionnel)

Sur le VPS, éditer la crontab (`crontab -e`) :

```cron
*/5 * * * * curl -s -H "Authorization: Bearer VOTRE_CRON_SECRET" https://sdcreativ.com/api/cron/calendar-reminders >> /var/log/sdcreativ-cron.log 2>&1
0 9 * * * curl -s -H "Authorization: Bearer VOTRE_CRON_SECRET" https://sdcreativ.com/api/cron/quote-follow-ups >> /var/log/sdcreativ-cron.log 2>&1
0 10 * * * curl -s -H "Authorization: Bearer VOTRE_CRON_SECRET" https://sdcreativ.com/api/cron/invoice-payment-reminders >> /var/log/sdcreativ-cron.log 2>&1
0 8 * * 1 curl -s -H "Authorization: Bearer VOTRE_CRON_SECRET" https://sdcreativ.com/api/cron/scheduled-reports >> /var/log/sdcreativ-reports.log 2>&1
```

Remplacez `VOTRE_CRON_SECRET` par la valeur de `CRON_SECRET` dans `.env.docker`.

---

## Mises à jour ultérieures

> Guide détaillé (mises à jour, logs, sauvegardes, dépannage) : [`OPERATIONS-VPS.md`](./OPERATIONS-VPS.md)

```bash
cd /var/www/sdcreativ
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod up -d --build app
./scripts/vps-post-deploy-check.sh
```

Pour un changement de secrets ou de config Nginx :

```bash
./scripts/docker-prod-deploy.sh
```

---

## Dépannage

| Problème | Cause probable | Action |
|----------|----------------|--------|
| Certbot échoue | DNS non propagé | `dig sdcreativ.com +short` → IP VPS ? Attendre 30 min |
| Certificat staging en prod | `CERTBOT_STAGING=1` | Remettre `0` dans `.env`, relancer `docker-prod-deploy.sh` |
| Nginx **502** | App pas healthy | `$COMPOSE logs app --tail 100` |
| CRM login refusé | Mauvais identifiants | Email = `CRM_BOOTSTRAP_EMAIL`, 1er mot de passe = `ADMIN_SECRET`, puis mot de passe personnel |
| CRM **Erreur serveur** au login | Schéma DB incomplet | `psql < scripts/db-repair-crm-schema.sql` puis redémarrer l'app |
| Emails **403** Resend | Domaine non vérifié | Vérifier SPF/DKIM sur `sdcreativ.com` dans Resend |
| `DATABASE_URL` invalide | Mot de passe désynchronisé | Aligner `POSTGRES_PASSWORD` (.env) et `DATABASE_URL` (.env.docker) |
| Port 5433 exposé | Normal en dev | Postgres n'est pas routé via Nginx ; en prod, ne pas ouvrir 5433 dans UFW |

### Commandes utiles

```bash
# Logs en direct
$COMPOSE logs -f app nginx

# État des services
$COMPOSE ps

# Recharger Nginx après changement config
$COMPOSE exec nginx nginx -s reload

# Shell dans le conteneur app
$COMPOSE exec app sh
```

---

## Guides complémentaires

| Document | Contenu |
|----------|---------|
| [`DOCKER-PRODUCTION.md`](./DOCKER-PRODUCTION.md) | Détails stack, dev local, commandes Compose |
| [`VPS-POST-DEPLOIEMENT.md`](./VPS-POST-DEPLOIEMENT.md) | Checklist complète, restauration, S3 |
| [`RESEND-EMAIL.md`](./RESEND-EMAIL.md) | Configuration email (adapter le domaine → `.com`) |

---

## Récapitulatif ordre d'exécution

1. DNS `@` + `www` → IP VPS
2. SSH + Docker + clone repo
3. Créer `.env` et `.env.docker` (mots de passe synchronisés)
4. `./scripts/docker-preflight.sh`
5. `CERTBOT_STAGING=1 ./scripts/docker-prod-deploy.sh` (test)
6. `./scripts/docker-prod-deploy.sh` (prod)
7. `./scripts/vps-post-deploy-check.sh`
8. Connexion CRM + config Resend + sauvegardes cron
