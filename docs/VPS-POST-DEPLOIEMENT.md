# Checklist post-déploiement VPS — SD CREATIV

À exécuter sur le **KVM4 Hostinger** après `./scripts/docker-prod-deploy.sh`.

Guide stack Docker : [DOCKER-PRODUCTION.md](./DOCKER-PRODUCTION.md)

**Domaine production : `sdcreativ.com`** — guide dédié : [DEPLOIEMENT-SDCREATIV-COM.md](./DEPLOIEMENT-SDCREATIV-COM.md)

---

## 1. Vérification automatique

```bash
chmod +x scripts/vps-post-deploy-check.sh scripts/db-backup.sh
./scripts/vps-post-deploy-check.sh
```

Le script contrôle : services Docker, HTTPS, CRM, RSS, secrets, disque, sauvegardes.

---

## 2. Checklist manuelle

### Infrastructure

- [ ] DNS `A` `@` et `www` → IP du VPS (`dig +short sdcreativ.com`)
- [ ] `./scripts/docker-preflight.sh` sans erreur
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod ps` — **app, postgres, redis, nginx, certbot** Up (healthy)
- [ ] Pare-feu : SSH (22), HTTP (80), HTTPS (443) uniquement
  ```bash
  ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
  ```

### Site & SSL

- [ ] https://sdcreativ.com → **200**
- [ ] http:// → redirection **301/308** vers https
- [ ] Certificat Let's Encrypt valide (pas staging si prod réelle)
- [ ] `/sitemap.xml` et `/blog/feed.xml` accessibles

### CRM & données

- [ ] https://sdcreativ.com/admin/login — connexion OK
- [ ] Logo / paramètres CRM chargés
- [ ] Blog : créer ou publier un article test
- [ ] `ADMIN_SECRET` et `POSTGRES_PASSWORD` **changés** (plus de valeurs par défaut)

### Emails & intégrations

- [ ] Formulaire contact → email reçu (Resend configuré dans `.env.docker`)
- [ ] `NEXT_PUBLIC_SITE_URL=https://sdcreativ.com` dans `.env.docker`
- [ ] Upload images blog OK (local ou S3 si configuré)

### Optionnel recommandé

- [ ] **Cloudflare** devant le domaine (cache, protection DDoS, proxy orange)
- [ ] Monitoring uptime (UptimeRobot, Better Stack, etc.)
- [ ] Copie des sauvegardes hors VPS → **automatisée via S3** si `AWS_*` configuré

---

## 3. Sauvegardes PostgreSQL

### Sauvegarde manuelle

```bash
# Dev local (postgres sur :5433)
./scripts/db-backup.sh

# VPS production
BACKUP_DIR=/var/backups/sdcreativ \
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml" \
./scripts/db-backup.sh
```

Fichiers créés dans `backups/` (local) ou `/var/backups/sdcreativ` (VPS) :

| Fichier | Contenu |
|---------|---------|
| `sdcreativ-YYYYMMDD-HHMMSS.dump` | Base PostgreSQL (pg_dump custom) |
| `sdcreativ-uploads-YYYYMMDD-HHMMSS.tar.gz` | Images blog (`public/uploads/blog`) si présentes |

Rétention par défaut : **14 jours** (`RETENTION_DAYS=30` pour 30 jours).

### Cron quotidien (VPS)

```bash
sudo BACKUP_DIR=/var/backups/sdcreativ CRON_HOUR=3 ./scripts/install-backup-cron.sh
```

Sauvegarde chaque nuit à **3h00**, logs dans `/var/log/sdcreativ-backup.log`.

Test :

```bash
sudo -u deploy BACKUP_DIR=/var/backups/sdcreativ \
  COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml" \
  ./scripts/db-backup.sh
```

### Restauration

```bash
# Depuis le disque local
./scripts/db-restore.sh /var/backups/sdcreativ/sdcreativ-20260630-030000.dump

# Depuis S3 (télécharge + restaure Postgres + uploads)
./scripts/backup-s3-restore.sh latest
./scripts/backup-s3-restore.sh sdcreativ-20260630-030000.dump
```

Sur VPS, prefixer avec `COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"`.

---

## 4. Sauvegardes automatiques sur S3

Les variables AWS sont déjà utilisées pour les documents CRM (`src/lib/s3.ts`). Les sauvegardes utilisent un **prefix dédié** dans le même bucket.

### Configuration (`.env.docker`)

```env
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=sdcreativ-documents-prod
AWS_S3_BACKUP_PREFIX=backups/sdcreativ
S3_BACKUP_RETENTION_DAYS=30
```

Politique IAM minimale recommandée (prefix `backups/sdcreativ/*`) :

- `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket`

### Fonctionnement

Chaque `./scripts/db-backup.sh` :

1. Dump PostgreSQL (`.dump`)
2. Archive `public/uploads/` (`.tar.gz`) si présente
3. **Upload automatique vers S3** + manifest JSON
4. Rotation locale (14 j) et S3 (30 j par défaut)

Structure S3 :

```
s3://votre-bucket/backups/sdcreativ/
  sdcreativ-20260630-030000.dump
  sdcreativ-uploads-20260630-030000.tar.gz
  sdcreativ-manifest-20260630-030000.json
```

### Commandes S3

```bash
# Lister les sauvegardes distantes
./scripts/backup-s3-list.sh

# Upload manuel
./scripts/backup-s3-upload.sh backups/sdcreativ-20260630-030000.dump

# Restaurer depuis S3
BACKUP_DIR=/var/backups/sdcreativ \
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml" \
./scripts/backup-s3-restore.sh latest
```

Le cron quotidien (`install-backup-cron.sh`) déclenche déjà l'upload S3 si AWS est configuré.

**Prérequis VPS :** Docker (pour le conteneur `amazon/aws-cli` utilisé en interne).

---

## 5. Commandes de maintenance

```bash
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod"

# Logs en direct
$COMPOSE logs -f nginx app

# Redéployer après changement .env.docker
$COMPOSE up -d --build app

# Espace disque Docker
docker system df

# Test renouvellement SSL
$COMPOSE run --rm certbot renew --dry-run
```

---

## 6. Calendrier recommandé

| Fréquence | Action |
|-----------|--------|
| **Quotidien** | Sauvegarde Postgres + upload S3 (cron) |
| **Hebdomadaire** | `./scripts/vps-post-deploy-check.sh` + `./scripts/backup-s3-list.sh` |
| **Mensuel** | Test restauration S3 sur environnement de test |
| **À chaque deploy** | `$COMPOSE ps` + test `/admin/login` |

---

## 7. Scripts livrés

| Script | Rôle |
|--------|------|
| `scripts/db-backup.sh` | Dump PostgreSQL + uploads + **upload S3 auto** |
| `scripts/db-restore.sh` | Restauration depuis un `.dump` local |
| `scripts/backup-s3-upload.sh` | Envoi manuel vers S3 |
| `scripts/backup-s3-list.sh` | Liste des sauvegardes S3 |
| `scripts/backup-s3-restore.sh` | Télécharge depuis S3 et restaure |
| `scripts/backup-s3-common.sh` | Helpers S3 (aws-cli Docker) |
| `scripts/install-backup-cron.sh` | Cron quotidien sur le VPS |
| `scripts/vps-post-deploy-check.sh` | Checklist automatisée |
| `scripts/docker-prod-deploy.sh` | Déploiement initial / rebuild |
