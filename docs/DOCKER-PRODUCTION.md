# Déploiement Docker production — SD CREATIV

Guide pour mettre **toute la stack en place avant la mise en production** : app, PostgreSQL, Redis, **Nginx**, **Certbot SSL**.

---

## Architecture

```
Internet :443 / :80
       ↓
   Nginx (SSL, reverse proxy)
       ↓
   Next.js app :3000 (réseau Docker interne)
       ↓
   PostgreSQL 16  +  Redis 7

Certbot → renouvellement Let's Encrypt (volume certbot_certs)
```

| Service | Dev local | Production VPS |
|---------|-----------|----------------|
| app | http://localhost:3001 | via Nginx uniquement |
| postgres | localhost:5433 | réseau interne |
| redis | réseau interne | réseau interne |
| nginx | — | :80 / :443 |
| certbot | — | renouvellement auto |

---

## Fichiers de configuration (2 fichiers)

| Fichier | Rôle | Chargé par |
|---------|------|------------|
| `.env` | Ports, domaine, Certbot, identifiants Postgres Compose | Docker Compose + Next.js dev |
| `.env.docker` | Secrets app (ADMIN_SECRET, DATABASE_URL, Resend, Sanity…) | Conteneur `app` uniquement |

**Important :** ne mettez pas `DATABASE_URL=...@postgres` dans `.env` — Next.js le chargerait en `npm run dev` et casserait la connexion locale.

### Création initiale

```bash
# 1. Ports & domaine (Compose)
cat > .env << 'EOF'
POSTGRES_USER=sdcreativ
POSTGRES_PASSWORD=CHANGE_ME_STRONG
POSTGRES_DB=sdcreativ
POSTGRES_PORT=5433
APP_PORT=3001
DOMAIN=sdcreativ.com
CERTBOT_EMAIL=admin@sdcreativ.com
CERTBOT_STAGING=0
EOF

# 2. Secrets app (conteneur)
cp .env.docker.example .env.docker
# Éditer .env.docker : ADMIN_SECRET, RESEND_API_KEY, SANITY_*, AWS_*, etc.
# NEXT_PUBLIC_SITE_URL=https://sdcreativ.com
```

Reprendre les valeurs depuis `.env.local` pour `.env.docker`.

---

## Étape 1 — Dev local (sans Nginx)

Valider l'app et la base avant le VPS :

```bash
docker compose up -d --build
# → http://localhost:3001
# → Postgres : localhost:5433
```

Parallèlement possible : `npm run dev` sur http://localhost:3000 (`.env.local`).

---

## Étape 2 — Pré-vol production

Sur le **VPS** (DNS `sdcreativ.com` → IP du serveur) :

```bash
chmod +x scripts/docker-preflight.sh scripts/docker-prod-deploy.sh
./scripts/docker-preflight.sh
```

Le script vérifie : fichiers `.env` / `.env.docker`, secrets, `DATABASE_URL`, syntaxe Compose, résolution DNS.

---

## Étape 3 — Déploiement production complet

### Premier test SSL (recommandé)

Sans consommer le quota Let's Encrypt :

```bash
CERTBOT_STAGING=1 ./scripts/docker-prod-deploy.sh
```

Puis vérifier https://sdcreativ.com (certificat « staging », non reconnu par le navigateur — normal).

### Production réelle

```bash
# Remettre CERTBOT_STAGING=0 dans .env
./scripts/docker-prod-deploy.sh
```

Ce script :

1. Lance le pré-vol
2. Met à jour `NEXT_PUBLIC_SITE_URL=https://DOMAIN` dans `.env.docker`
3. Build l'image Next.js
4. Exécute `init-letsencrypt.sh` (certificats + Nginx)
5. Démarre Nginx + Certbot (renouvellement toutes les 12 h)

### Manuel (alternative)

```bash
./docker/certbot/init-letsencrypt.sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod up -d --build
```

---

## Étape 4 — Pare-feu VPS

N'exposer que HTTP/HTTPS :

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Le port `3001` n'est **pas** exposé en prod (`docker-compose.prod.yml` retire le mapping).

---

## Étape 5 — Migration base de données

Depuis votre Mac (Postgres local) vers Docker VPS :

```bash
# Export local
pg_dump -U user -d sdcreativ -Fc > sdcreativ.dump

# Import sur VPS (Postgres Docker, port interne ou 5433 si exposé temporairement)
pg_restore -U sdcreativ -h localhost -p 5433 -d sdcreativ --clean --if-exists sdcreativ.dump
```

---

## Vérifications post-déploiement

```bash
# Services
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod ps

# Site
curl -I https://sdcreativ.com

# Logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod logs -f nginx app

# CRM
# https://sdcreativ.com/admin/login
```

Checklist :

- [ ] `./scripts/docker-preflight.sh` sans erreur
- [ ] `docker compose … ps` — app, postgres, redis, nginx, certbot **Up (healthy)**
- [ ] https://sdcreativ.com répond 200
- [ ] Redirection http → https OK
- [ ] `/admin/login` accessible
- [ ] Formulaire contact envoie un email (Resend)
- [ ] `ADMIN_SECRET` et `POSTGRES_PASSWORD` changés (plus de valeurs par défaut)
- [ ] Sauvegarde Postgres configurée — voir [VPS-POST-DEPLOIEMENT.md](./VPS-POST-DEPLOIEMENT.md)

---

## Sauvegardes & post-déploiement

Checklist complète, cron et restauration : **[docs/VPS-POST-DEPLOIEMENT.md](./VPS-POST-DEPLOIEMENT.md)**

```bash
# Sauvegarde manuelle (VPS)
BACKUP_DIR=/var/backups/sdcreativ \
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml" \
./scripts/db-backup.sh

# Checklist automatisée
./scripts/vps-post-deploy-check.sh

# Cron quotidien 3h
sudo ./scripts/install-backup-cron.sh
```

---

## Cron messagerie (IMAP Hostinger)

Sync lecture seule de `contact@sdcreativ.com` via `GET /api/cron/mail-sync`.

**Prérequis `.env.docker` :**
- `MAIL_CREDENTIALS_SECRET` (≥32 caractères)
- Boîte créée : `POST /api/admin/mail/mailboxes` (MDP Hostinger de `contact@`)
- `MAIL_SYNC_ENABLED=1`
- `CRON_SECRET` + `NEXT_PUBLIC_SITE_URL=https://votre-domaine`

**Installation VPS :**
```bash
chmod +x scripts/install-mail-sync-cron.sh scripts/run-mail-sync-cron.sh scripts/check-mail-messagerie.sh
sudo SITE_URL=https://sdcreativ.com ./scripts/install-mail-sync-cron.sh
# → crontab */5 * * * *  (wrapper scripts/run-mail-sync-cron.sh)
```

**Vérification :**
```bash
./scripts/check-mail-messagerie.sh
# UI : /admin/crm/messagerie — bandeau « Validation Phase 1 »
# API : GET /api/admin/mail/validation (session admin, permission mail.read)
```

Critère Phase 1 : ≥ 20 messages importés, credentials jamais exposés dans les réponses API, PJ listées en métadonnées (téléchargement S3 = Phase 2).

---

## Webhook Agentic Mail (temps réel — Phase 5)

Nouveaux mails visibles en quelques secondes via `POST /api/webhooks/hostinger-mail` (sync IMAP incrémentale `last_uid`). Le cron reste le **fallback** si le webhook est down.

**1. Secret dans `.env.docker` :**
```bash
# Générer : node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
HOSTINGER_MAIL_WEBHOOK_SECRET=votre_secret_long
```
Redémarrer le conteneur `app`.

**2. hPanel Hostinger :**
1. Emails → domaine → **Agentic mail** → **Webhooks**
2. **Add webhook**
3. Choisir la boîte (ex. `contact@sdcreativ.com` ; répéter pour chaque boîte individuelle)
4. URL : `https://sdcreativ.com/api/webhooks/hostinger-mail`
5. Événement : `message.received`
6. Copier le **Bearer token** affiché une seule fois → coller dans `HOSTINGER_MAIL_WEBHOOK_SECRET`  
   (si Hostinger génère son propre token, utilisez **celui-ci** comme valeur du secret, pas un secret inventé)

**3. Test :**
- Bouton **Test** sur la ligne webhook dans hPanel (doit renvoyer HTTP 200)
- Ou : `curl -sS -X POST -H "Authorization: Bearer $HOSTINGER_MAIL_WEBHOOK_SECRET" -H "Content-Type: application/json" -d '{"event_type":"message.received","mailbox":"contact@sdcreativ.com"}' https://sdcreativ.com/api/webhooks/hostinger-mail`
- Health : `GET https://sdcreativ.com/api/webhooks/hostinger-mail` → `{ configured: true }`

**Debounce :** ~4 s par boîte pour éviter le hammering IMAP si plusieurs événements arrivent d’affilée.

---

## Commandes utiles

```bash
# Redémarrer après changement .env.docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod up -d --build app

# Recharger Nginx (après modif conf)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod exec nginx nginx -s reload

# Renouvellement SSL manuel (test)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod run --rm certbot renew --dry-run

# Arrêter toute la stack
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod down
```

---

## Fichiers livrés

| Fichier | Description |
|---------|-------------|
| `docker-compose.yml` | Stack de base (app, postgres, redis) |
| `docker-compose.override.yml` | Dev local — expose l'app sur `:3001` (auto-chargé) |
| `docker-compose.prod.yml` | Prod VPS — sans override dev, avec Nginx |
| `docker/nginx/nginx.conf` | Config Nginx principale |
| `docker/nginx/conf.d/sdcreativ.conf.template` | Virtual host (généré → `sdcreativ.conf`) |
| `docker/certbot/init-letsencrypt.sh` | Obtention certificats SSL |
| `scripts/docker-preflight.sh` | Vérifications pré-déploiement |
| `scripts/docker-prod-deploy.sh` | Déploiement production en une commande |
| `scripts/db-backup.sh` | Sauvegarde PostgreSQL (+ uploads blog) |
| `scripts/db-restore.sh` | Restauration depuis un dump |
| `scripts/install-backup-cron.sh` | Cron sauvegarde quotidienne (VPS) |
| `scripts/install-mail-sync-cron.sh` | Cron sync IMAP messagerie (toutes les 5 min) |
| `scripts/run-mail-sync-cron.sh` | Wrapper curl Bearer CRON_SECRET → `/api/cron/mail-sync` |
| `scripts/check-mail-messagerie.sh` | Checklist ops messagerie (sans afficher les secrets) |
| `scripts/vps-post-deploy-check.sh` | Checklist post-déploiement automatisée |
| `docs/VPS-POST-DEPLOIEMENT.md` | Guide complet post-prod + sauvegardes |

---

## Dépannage

| Problème | Cause probable | Action |
|----------|----------------|--------|
| Certbot échoue | DNS non propagé | `dig sdcreativ.com`, attendre propagation |
| Nginx 502 | App pas prête | `docker compose … logs app`, vérifier healthcheck |
| Site en HTTP seulement | Certificats absents | Relancer `init-letsencrypt.sh` |
| CRM « Failed to fetch » en local | Mauvais port / SW PWA | Dev :3000, Docker :3001 ; désactiver SW en dev |
| Quota Let's Encrypt | Trop de tentatives | `CERTBOT_STAGING=1` puis retenter |

---

## Alternative sans Docker

Guide PM2 + Nginx système : `docs/DEPLOIEMENT-VPS-HOSTINGER.md`.

La stack Docker documentée ici est l'option **recommandée** pour un déploiement reproductible.
