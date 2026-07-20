# Procédure complète — Mise en production SD CREATIV

Guide pas à pas pour déployer **SD CREATIV** (Next.js 16 + PostgreSQL + CRM) en production avec l’architecture recommandée :

**VPS Hostinger + PostgreSQL local + AWS S3 + Resend**

> Guides complémentaires :
> - [`DEPLOIEMENT-VPS-HOSTINGER.md`](./DEPLOIEMENT-VPS-HOSTINGER.md) — référence VPS détaillée
> - [`AWS-DOCUMENTS.md`](./AWS-DOCUMENTS.md) — configuration S3
> - [`DEPLOIEMENT.md`](./DEPLOIEMENT.md) — variables d’environnement et crons
> - [`.env.example`](../.env.example) — liste complète des variables

---

## Vue d’ensemble

```
Internet → sdcreativ.fr (DNS Hostinger)
              ↓
         Nginx :443 (SSL Let's Encrypt)
              ↓
         Next.js :3000 (PM2)
              ↓
    PostgreSQL (localhost) + AWS S3 + Resend
```

| Composant | Rôle | Coût estimé |
|-----------|------|-------------|
| **Hostinger VPS** | App Next.js, PostgreSQL, Nginx, PM2 | ~10–15 €/mois |
| **Hostinger domaine** | `sdcreativ.fr` + DNS | ~1 €/mois (annualisé) |
| **AWS S3** | Documents espace client | ~1–3 €/mois |
| **Resend** | Emails transactionnels + invitations CRM | 0–20 €/mois |
| **Total** | | **~15–35 €/mois** |

---

## Phase 0 — Prérequis (avant le serveur)

### Comptes à créer

| Compte | Usage |
|--------|--------|
| **Hostinger** | VPS + domaine `sdcreativ.fr` |
| **GitHub** | Code source du projet |
| **AWS** | Bucket S3 documents |
| **Resend** | Emails (contact, CRM, invitations) |

### Commander le VPS

- **Offre :** KVM2 minimum, **8 Go RAM** recommandé (build Next.js + PostgreSQL)
- **OS :** Ubuntu 22.04 ou 24.04 LTS
- Noter l’**IP publique** du VPS

### Activer les snapshots Hostinger

hPanel → VPS → Snapshots → activer (sauvegarde complète du serveur).

---

## Phase 1 — AWS S3 (documents clients)

Détail complet : [`AWS-DOCUMENTS.md`](./AWS-DOCUMENTS.md)

### 1.1 Créer le bucket

1. **AWS Console → S3 → Create bucket**
2. Nom : `sdcreativ-documents-prod`
3. Région : `eu-west-1` (Irlande)
4. **Block all public access** : activé
5. Chiffrement SSE-S3 : par défaut
6. Versioning : recommandé (optionnel)

### 1.2 Utilisateur IAM

Créer un utilisateur `sdcreativ-documents-app` avec cette policy (adapter le nom du bucket si besoin) :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::sdcreativ-documents-prod",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["clients/*"]
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::sdcreativ-documents-prod/clients/*"
    }
  ]
}
```

Générer une **Access Key** → noter `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY`.

### 1.3 CORS du bucket

Configuration CORS (ajouter vos domaines) :

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": [
      "https://sdcreativ.fr",
      "https://www.sdcreativ.fr",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Phase 2 — Resend (emails)

> **Guide détaillé (DNS Hostinger, boîte mail, tests, dépannage) :** [`RESEND-EMAIL.md`](./RESEND-EMAIL.md)

1. Créer un compte sur [resend.com](https://resend.com)
2. **Domains → Add domain** → `sdcreativ.fr`
3. Copier les enregistrements **SPF / DKIM** affichés par Resend
4. Les ajouter dans **Hostinger → DNS Zone** (Phase 3)
5. Attendre la vérification (quelques minutes à 24 h)
6. Noter la clé API : `RESEND_API_KEY=re_...`

> **Important :** `CONTACT_FROM_EMAIL` doit utiliser un domaine vérifié sur Resend (ex. `contact@sdcreativ.fr`). La création d’une boîte mail Hostinger n’est **pas** requise pour l’envoi — voir [`RESEND-EMAIL.md`](./RESEND-EMAIL.md).

---

## Phase 3 — DNS Hostinger

hPanel → Domaines → `sdcreativ.fr` → Zone DNS :

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| **A** | `@` | IP publique du VPS | 3600 |
| **A** | `www` | IP publique du VPS | 3600 |
| **TXT/CNAME** | (selon Resend) | SPF + DKIM pour emails | — |

Vérifier la propagation :

```bash
dig sdcreativ.fr +short
```

Propagation DNS : 5 min à 24 h.

---

## Phase 4 — Préparer le VPS

Connexion SSH :

```bash
ssh root@IP_DU_VPS
```

### 4.1 Mises à jour + pare-feu

```bash
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx ufw

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### 4.2 Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # v20.x
npm -v
```

### 4.3 PM2

```bash
npm install -g pm2
```

### 4.4 PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

Créer la base CRM :

```bash
sudo -u postgres psql
```

```sql
CREATE USER sdcreativ WITH PASSWORD 'MOT_DE_PASSE_FORT_ICI';
CREATE DATABASE sdcreativ OWNER sdcreativ;
GRANT ALL PRIVILEGES ON DATABASE sdcreativ TO sdcreativ;
\q
```

> PostgreSQL reste en **localhost uniquement** — ne pas exposer le port 5432 sur Internet.

### 4.5 Utilisateur deploy (sécurité)

Évitez de faire tourner l’app en root :

```bash
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
su - deploy
```

---

## Phase 5 — Déployer le code

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/VOTRE_ORG/sdcreativ.git
cd sdcreativ
npm ci
```

---

## Phase 6 — Fichier `.env` (secrets production)

```bash
cp .env.example .env
nano .env
chmod 600 .env
chown deploy:deploy .env
```

### Variables obligatoires

```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://sdcreativ.fr

# CRM & auth
ADMIN_SECRET=generer-un-secret-long-et-unique
CRM_BOOTSTRAP_EMAIL=admin@sdcreativ.com
CRM_BOOTSTRAP_NAME=Administrateur SD CREATIV

# Base de données
DATABASE_URL=postgresql://sdcreativ:MOT_DE_PASSE_FORT_ICI@localhost:5432/sdcreativ

# Emails
RESEND_API_KEY=re_xxxxxxxx
CONTACT_FROM_EMAIL=contact@sdcreativ.fr
CONTACT_TO_EMAIL=contact@sdcreativ.fr

# AWS S3
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=sdcreativ-documents-prod

# Cron (générer une chaîne aléatoire longue, différente de ADMIN_SECRET)
CRON_SECRET=generer-un-autre-secret-long

# Coordonnées site (adapter)
NEXT_PUBLIC_CONTACT_EMAIL=contact@sdcreativ.fr
NEXT_PUBLIC_CONTACT_PHONE=+225 07 XX XX XX XX
NEXT_PUBLIC_CONTACT_ADDRESS=Abidjan, Côte d'Ivoire
```

### Variables optionnelles

| Variable | Usage |
|----------|--------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 |
| `NEXT_PUBLIC_SENTRY_DSN` | Monitoring erreurs Sentry |
| `OPENAI_API_KEY` | Assistant IA du site |
| `CLIENT_PORTAL_TOKENS` | Accès espace client (JSON) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Sync calendrier Google |
| `TWILIO_*` | Rappels SMS calendrier |
| `SANITY_*` | CMS blog & réalisations |

Liste complète : [`.env.example`](../.env.example).

### Règles de sécurité

- Ne **jamais** committer `.env` sur Git
- Ne **jamais** placer `.env` dans un dossier web public
- Ne **pas** stocker les clés dans le CRM (Paramètres = monitoring uniquement)
- `ADMIN_SECRET` et `CRON_SECRET` **différents** entre dev et production
- Sauvegarder `.env` dans un coffre d’équipe (1Password, Bitwarden…)

---

## Phase 7 — Initialiser la base + build

```bash
cd ~/apps/sdcreativ
export $(grep -v '^#' .env | xargs)
npm run db:init
npm run build
```

Si le build manque de RAM :

```bash
NODE_OPTIONS=--max-old-space-size=2048 npm run build
```

Le schéma CRM (leads, clients, projets, devis, factures, tâches, tickets, calendrier, rôles…) est créé via `scripts/db-init.sql`. L’application peut aussi auto-créer les tables au premier accès API.

---

## Phase 8 — Démarrer avec PM2

```bash
pm2 start npm --name sdcreativ -- start
pm2 save
pm2 startup
# Exécuter la commande sudo affichée par PM2
pm2 save
```

Alternative avec fichier ecosystem (optionnel) :

```javascript
// ecosystem.config.cjs — à la racine du projet
module.exports = {
  apps: [{
    name: "sdcreativ",
    cwd: "/home/deploy/apps/sdcreativ",
    script: "npm",
    args: "start",
    env: { NODE_ENV: "production", PORT: 3000 },
  }],
};
```

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

Vérifier :

```bash
pm2 status
curl -I http://127.0.0.1:3000
```

---

## Phase 9 — Nginx + SSL

En root ou sudo :

```bash
nano /etc/nginx/sites-available/sdcreativ.fr
```

```nginx
server {
    listen 80;
    server_name sdcreativ.fr www.sdcreativ.fr;
    return 301 https://sdcreativ.fr$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sdcreativ.fr;

    ssl_certificate     /etc/letsencrypt/live/sdcreativ.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sdcreativ.fr/privkey.pem;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activer et obtenir le certificat :

```bash
ln -s /etc/nginx/sites-available/sdcreativ.fr /etc/nginx/sites-enabled/
nginx -t
certbot --nginx -d sdcreativ.fr -d www.sdcreativ.fr
systemctl reload nginx
certbot renew --dry-run
```

---

## Phase 10 — Crons (rappels CRM par email)

Sur le VPS, éditer la crontab de l’utilisateur `deploy` :

```bash
crontab -e
```

```cron
# Rappels calendrier CRM — toutes les 5 min
*/5 * * * * curl -s -H "Authorization: Bearer VOTRE_CRON_SECRET" https://sdcreativ.fr/api/cron/calendar-reminders >> /var/log/sdcreativ-cron.log 2>&1

# Relances devis (optionnel, 1x/jour à 9h)
0 9 * * * curl -s -H "Authorization: Bearer VOTRE_CRON_SECRET" https://sdcreativ.fr/api/cron/quote-follow-ups >> /var/log/sdcreativ-cron.log 2>&1

# Relances factures (optionnel, 1x/jour à 10h)
0 10 * * * curl -s -H "Authorization: Bearer VOTRE_CRON_SECRET" https://sdcreativ.fr/api/cron/invoice-payment-reminders >> /var/log/sdcreativ-cron.log 2>&1

# Rapports planifiés (optionnel, selon configuration CRM)
0 8 * * 1 curl -s -H "Authorization: Bearer VOTRE_CRON_SECRET" https://sdcreativ.fr/api/cron/scheduled-reports >> /var/log/sdcreativ-cron.log 2>&1
```

Test manuel :

```bash
curl -s -H "Authorization: Bearer VOTRE_CRON_SECRET" \
  https://sdcreativ.fr/api/cron/calendar-reminders
```

Réponse attendue : `{"sent":0,...}` ou `{"sent":N}` si des rappels sont dus.

> Les notifications **in-app** (toasts + cloche du header CRM) fonctionnent sans cron dès qu’un utilisateur a le CRM ouvert. Le cron email couvre les cas où personne n’est connecté.

---

## Phase 11 — Sauvegardes PostgreSQL

Créer le dossier de backups :

```bash
sudo mkdir -p /var/backups
```

Cron root (quotidien à 3h) :

```bash
sudo crontab -e
```

```cron
0 3 * * * sudo -u postgres pg_dump sdcreativ | gzip > /var/backups/sdcreativ-$(date +\%F).sql.gz
```

Conserver 7 à 30 jours de dumps. Hostinger propose aussi des **snapshots VPS** — activez-les dans hPanel.

### Restaurer un dump

```bash
gunzip -c /var/backups/sdcreativ-2026-07-03.sql.gz | sudo -u postgres psql sdcreativ
```

### Sauvegarder le fichier `.env`

Sauvegarde chiffrée hors serveur (gestionnaire de mots de passe, coffre d’équipe). En cas de perte du VPS, vous devez pouvoir recréer `.env`.

---

## Phase 12 — Premier accès CRM

1. Ouvrir `https://sdcreativ.fr/admin/login`
2. **Première connexion bootstrap :**
   - Email : `admin@sdcreativ.com` (ou celui de `CRM_BOOTSTRAP_EMAIL`)
   - Mot de passe : valeur de `ADMIN_SECRET` (crée l’admin en base au 1er login)
3. Aller dans **CRM → Paramètres** et vérifier :
   - PostgreSQL : **Opérationnel**
   - Resend : **Opérationnel**
   - AWS S3 : **Opérationnel**
   - Authentification admin : **Active**
4. **Paramètres → Équipe → Rôles & permissions** : créer les rôles personnalisés (voir [`CRM-ROLES-PERMISSIONS.md`](./CRM-ROLES-PERMISSIONS.md))
5. **Paramètres → Équipe → Utilisateurs** : inviter les collaborateurs (email avec lien d’activation, valable 72 h)
6. Tester le **formulaire contact** → email reçu via Resend
7. Tester un **upload document** → fichier visible dans S3

---

## Phase 13 — Checklist de validation

| Test | URL / action | Attendu |
|------|--------------|---------|
| Site public | `https://sdcreativ.fr` | Page d’accueil OK |
| CRM login | `/admin/login` | Formulaire OK |
| Dashboard | `/admin/crm` | KPI après connexion |
| Paramètres | `/admin/crm/parametres` | Intégrations vertes |
| Contact | Formulaire contact | Email reçu |
| Devis en ligne | `/devis` | Email récapitulatif |
| Documents | `/admin/crm/documents` | Upload S3 OK |
| Espace client | `/espace-client` | Portail OK |
| Invitation user | Créer un utilisateur test | Email avec lien reçu |
| Activation compte | Lien invitation | Définir mot de passe → login OK |
| SSL | Cadenas navigateur | Certificat valide |
| Cron | `curl` manuel | JSON sans erreur |

---

## Phase 14 — Mises à jour (routine)

À chaque déploiement :

```bash
su - deploy
cd ~/apps/sdcreativ
git pull origin main
npm ci
npm run build
pm2 restart sdcreativ
```

Le fichier `.env` **n’est pas écrasé** par `git pull` (non versionné).

### Script de déploiement (optionnel)

```bash
#!/bin/bash
# ~/apps/sdcreativ/scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull origin main
npm ci
npm run build
pm2 restart sdcreativ
echo "Déploiement terminé — $(date)"
```

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

## Phase 15 — Sécurité (checklist finale)

- [ ] SSH par **clé** (mot de passe root désactivé)
- [ ] UFW : ports **22, 80, 443** uniquement
- [ ] PostgreSQL **localhost** seulement (port 5432 non exposé)
- [ ] `.env` en `chmod 600`
- [ ] `ADMIN_SECRET` fort et unique en prod
- [ ] `CRON_SECRET` différent de `ADMIN_SECRET`
- [ ] Mises à jour système régulières (`apt upgrade`)
- [ ] Snapshots VPS Hostinger activés
- [ ] Sauvegardes PostgreSQL quotidiennes
- [ ] Domaine Resend vérifié (SPF/DKIM)
- [ ] IAM S3 limité au strict nécessaire (`clients/*` uniquement)
- [ ] Fail2ban (optionnel) : `apt install fail2ban`

---

## Où mettre quoi — récapitulatif

| Élément | Emplacement | Sur Git ? |
|---------|-------------|-----------|
| Code source | VPS `~/apps/sdcreativ` | Oui (dépôt) |
| Secrets / clés API | `.env` sur le VPS | **Non** |
| Dev local | `.env.local` | **Non** |
| Base CRM | PostgreSQL local | Non (sauvegardes dump) |
| Documents clients | AWS S3 | Non |
| Emails | Resend (externe) | — |
| CRM Paramètres | Monitoring intégrations | — |

---

## Dépannage

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| Site inaccessible | DNS ou Nginx | `dig sdcreativ.fr`, `nginx -t`, `systemctl status nginx` |
| 502 Bad Gateway | Next.js arrêté | `pm2 status`, `pm2 logs sdcreativ`, `pm2 restart sdcreativ` |
| CRM 503 base de données | `DATABASE_URL` incorrect | Vérifier `.env`, tester `psql` manuel |
| Emails non envoyés | Resend / domaine | Vérifier clé API et DNS SPF/DKIM |
| Invitation non reçue | Resend non configuré | Vérifier logs PM2 ; en dev, lien dans la console |
| Documents 503 | AWS mal configuré | CRM Paramètres → S3, voir [`AWS-DOCUMENTS.md`](./AWS-DOCUMENTS.md) |
| Build échoue (mémoire) | RAM insuffisante | `NODE_OPTIONS=--max-old-space-size=2048 npm run build` ou VPS 8 Go |
| Certificat SSL expiré | Certbot | `certbot renew` |

### Logs utiles

```bash
pm2 logs sdcreativ --lines 100
sudo tail -f /var/log/nginx/error.log
sudo journalctl -u postgresql -n 50
tail -f /var/log/sdcreativ-cron.log
```

---

## Ordre recommandé (résumé)

1. Commander VPS + noter IP
2. Configurer S3 (AWS)
3. Configurer Resend + DNS email
4. Pointer le domaine vers le VPS
5. Installer stack sur VPS (Node, Postgres, Nginx…)
6. Cloner le projet + créer `.env`
7. `npm run db:init` → `npm run build` → PM2
8. Nginx + Certbot SSL
9. Crons + backups PostgreSQL
10. Premier login CRM + invitations équipe + validation

---

## Quand migrer vers autre chose ?

L’architecture VPS + S3 + Resend convient tant que :

- Trafic modéré (site vitrine + CRM interne)
- Équipe < 20 personnes sur le CRM
- Pas d’exigence contractuelle « cloud certifié »

Repassez sur AWS complet ou Vercel + base managée quand :

- Besoin de haute disponibilité (multi-zone)
- Plusieurs environnements (staging + prod séparés)
- Trafic très variable nécessitant l’auto-scaling
- Équipe avec expertise cloud dédiée

Migration recommandée **service par service**, pas tout d’un coup.

---

*Dernière mise à jour : juillet 2026*
