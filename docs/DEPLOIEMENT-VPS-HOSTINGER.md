# Guide de déploiement — VPS Hostinger (sdcreativ.fr)

Ce document décrit le déploiement de **SD CREATIV** (Next.js 16 + PostgreSQL + CRM) sur un **VPS Hostinger**, avec le domaine **sdcreativ.fr**.

> **Procédure complète de A à Z (S3 + Resend + crons + checklist) :** [`PROCEDURE-PRODUCTION-COMPLETE.md`](./PROCEDURE-PRODUCTION-COMPLETE.md)

> **Alternative cloud :** déploiement via Vercel → voir [`DEPLOIEMENT.md`](./DEPLOIEMENT.md).

---

## Vue d'ensemble

| Composant | Rôle |
|-----------|------|
| **Hostinger** | Domaine `sdcreativ.fr`, DNS, VPS |
| **VPS** | Node.js, Next.js, PostgreSQL, Nginx, PM2 |
| **AWS S3** | Documents espace client (externe) |
| **Resend** | Emails transactionnels (externe) |
| **Fichier `.env`** | Toutes les clés API et secrets (jamais dans Git ni le CRM) |

```
Internet → sdcreativ.fr (DNS Hostinger)
              ↓
         Nginx :443 (SSL Let's Encrypt)
              ↓
         Next.js :3000 (PM2)
              ↓
    PostgreSQL localhost + AWS S3 + Resend
```

---

## Prérequis

- VPS Hostinger (Ubuntu 22.04 ou 24.04 recommandé)
- Accès SSH root ou sudo
- Domaine **sdcreativ.fr** géré chez Hostinger
- Dépôt Git du projet (GitHub, GitLab…)
- Comptes **AWS** (S3) et **Resend** configurés — voir [`AWS-DOCUMENTS.md`](./AWS-DOCUMENTS.md)

**Specs VPS minimales recommandées :**

| Ressource | Minimum |
|-----------|---------|
| RAM | 2 Go (4 Go confortable avec PostgreSQL) |
| CPU | 2 vCPU |
| Disque | 40 Go SSD |

---

## Étape 1 — DNS Hostinger

Dans **hPanel → Domaines → sdcreativ.fr → DNS / Zone DNS** :

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| **A** | `@` | IP publique du VPS | 3600 |
| **A** | `www` | IP publique du VPS | 3600 |

Remplacez `IP_PUBLIQUE_VPS` par l’adresse affichée dans le panel VPS Hostinger.

Propagation DNS : 5 min à 24 h. Vérifiez avec :

```bash
dig sdcreativ.fr +short
```

---

## Étape 2 — Préparer le VPS

Connectez-vous en SSH :

```bash
ssh root@IP_PUBLIQUE_VPS
```

### Mises à jour et pare-feu

```bash
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx ufw

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # v20.x
npm -v
```

### PM2 (gestionnaire de processus)

```bash
npm install -g pm2
```

### PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

Créer l’utilisateur et la base CRM :

```bash
sudo -u postgres psql
```

```sql
CREATE USER sdcreativ WITH PASSWORD 'CHOISIR_UN_MOT_DE_PASSE_FORT';
CREATE DATABASE sdcreativ OWNER sdcreativ;
GRANT ALL PRIVILEGES ON DATABASE sdcreativ TO sdcreativ;
\q
```

PostgreSQL n’écoute que en local par défaut — ne pas exposer le port 5432 sur Internet.

---

## Étape 3 — Utilisateur de déploiement

Évitez de faire tourner l’app en root :

```bash
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Passez à l’utilisateur `deploy` :

```bash
su - deploy
```

---

## Étape 4 — Cloner et builder le projet

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/VOTRE_ORG/sdcreativ.git
cd sdcreativ
npm ci
```

---

## Étape 5 — Variables d'environnement (`.env`)

Copiez le modèle et éditez-le **sur le serveur uniquement** :

```bash
cp .env.example .env
nano .env
```

### Variables obligatoires en production

| Variable | Exemple / note |
|----------|----------------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_SITE_URL` | `https://sdcreativ.fr` |
| `ADMIN_SECRET` | Mot de passe fort (accès `/admin/crm`) |
| `DATABASE_URL` | `postgresql://sdcreativ:MOT_DE_PASSE@localhost:5432/sdcreativ` |
| `RESEND_API_KEY` | Clé Resend |
| `CONTACT_FROM_EMAIL` | `contact@sdcreativ.fr` (domaine vérifié sur Resend) |
| `CONTACT_TO_EMAIL` | Boîte qui reçoit les demandes |
| `AWS_REGION` | `eu-west-1` |
| `AWS_ACCESS_KEY_ID` | Clé IAM S3 |
| `AWS_SECRET_ACCESS_KEY` | Secret IAM |
| `AWS_S3_BUCKET` | `sdcreativ-documents-prod` |
| `CLIENT_PORTAL_TOKENS` | JSON des comptes espace client |

Liste complète : [`.env.example`](../.env.example).

### Sécuriser le fichier

```bash
chmod 600 .env
chown deploy:deploy .env
```

**Règles de sécurité :**

- Ne **jamais** committer `.env` sur Git
- Ne **jamais** placer `.env` dans un dossier web public
- Ne **pas** stocker les clés dans le CRM (page Paramètres = monitoring uniquement)
- Utiliser un `ADMIN_SECRET` différent entre dev et production

---

## Étape 6 — Initialiser la base de données

```bash
cd ~/apps/sdcreativ
export $(grep -v '^#' .env | xargs)   # charge DATABASE_URL
npm run db:init
```

Le schéma CRM (leads, clients, projets, devis, tâches, tickets, calendrier) est créé via `scripts/db-init.sql`. L’application peut aussi auto-créer les tables au premier accès API.

---

## Étape 7 — Build et démarrage PM2

```bash
npm run build
pm2 start npm --name sdcreativ -- start
pm2 save
```

PM2 doit démarrer Next.js en lisant `.env` depuis le répertoire courant. Alternative avec fichier ecosystem :

```bash
# ecosystem.config.cjs (optionnel, à la racine du projet)
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

Activer le redémarrage automatique au boot :

```bash
pm2 startup
# Exécuter la commande sudo affichée par PM2
pm2 save
```

Vérifier :

```bash
pm2 status
curl -I http://127.0.0.1:3000
```

---

## Étape 8 — Nginx (reverse proxy + SSL)

En tant que root (ou sudo) :

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

    # Certificats Let's Encrypt (certbot les remplira)
    ssl_certificate     /etc/letsencrypt/live/sdcreativ.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sdcreativ.fr/privkey.pem;

    # Limite upload (formulaires, documents)
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

Activer le site :

```bash
ln -s /etc/nginx/sites-available/sdcreativ.fr /etc/nginx/sites-enabled/
nginx -t
```

Obtenir le certificat SSL (avant d’activer le bloc 443 si certbot échoue, commentez temporairement le server 443) :

```bash
certbot --nginx -d sdcreativ.fr -d www.sdcreativ.fr
```

Renouvellement automatique (cron certbot installé par défaut) :

```bash
certbot renew --dry-run
```

Redémarrer Nginx :

```bash
systemctl reload nginx
```

---

## Étape 9 — Vérifications

| URL | Attendu |
|-----|---------|
| `https://sdcreativ.fr` | Page d’accueil |
| `https://sdcreativ.fr/admin/login` | Connexion CRM |
| `https://sdcreativ.fr/admin/crm` | Dashboard (après login) |
| `https://sdcreativ.fr/espace-client` | Portail client |
| `https://sdcreativ.fr/admin/crm/parametres` | Santé des intégrations |

Dans le CRM **Paramètres**, vérifiez :

- PostgreSQL : **Opérationnel**
- Resend : **Opérationnel** (ou mode dégradé si clé absente)
- AWS S3 : **Opérationnel**
- Authentification admin : **Active**

Test formulaire contact → email reçu via Resend.

---

## Mises à jour (déploiement)

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
```

---

## Sauvegardes

### PostgreSQL (quotidien recommandé)

```bash
sudo -u postgres pg_dump sdcreativ | gzip > /var/backups/sdcreativ-$(date +%F).sql.gz
```

Cron (root) :

```cron
0 3 * * * sudo -u postgres pg_dump sdcreativ | gzip > /var/backups/sdcreativ-$(date +\%F).sql.gz
```

Conservez 7 à 30 jours de dumps. Hostinger propose aussi des **snapshots VPS** — activez-les dans hPanel.

### Fichier `.env`

Sauvegarde chiffrée hors serveur (gestionnaire de mots de passe, coffre d’équipe). En cas de perte du VPS, vous devez pouvoir recréer `.env`.

---

## Emails et domaine

1. **Resend** : ajoutez et vérifiez `sdcreativ.fr` (enregistrements DNS SPF/DKIM dans Hostinger) — guide complet : [`RESEND-EMAIL.md`](./RESEND-EMAIL.md).
2. **Boîtes mail Hostinger** (optionnel) : `contact@sdcreativ.fr` pour la communication humaine.
3. **`CONTACT_FROM_EMAIL`** : doit correspondre à un domaine vérifié sur Resend.

---

## Où mettre quoi — récapitulatif

| Élément | Emplacement | Sur Git ? |
|---------|-------------|-----------|
| Code source | VPS `~/apps/sdcreativ` | Oui (dépôt) |
| Secrets / clés API | `.env` sur le VPS | **Non** |
| Dev local | `.env.local` | **Non** |
| Base CRM | PostgreSQL local | Non (sauvegardes dump) |
| Documents clients | AWS S3 | Non |
| CRM Paramètres | Monitoring intégrations | — |

---

## Dépannage

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| Site inaccessible | DNS ou Nginx | `dig sdcreativ.fr`, `nginx -t`, `systemctl status nginx` |
| 502 Bad Gateway | Next.js arrêté | `pm2 status`, `pm2 logs sdcreativ` |
| CRM 503 base de données | `DATABASE_URL` incorrect | Vérifier `.env`, `psql` manuel |
| Emails non envoyés | Resend / domaine | Vérifier clé API et DNS Resend |
| Documents 503 | AWS mal configuré | CRM Paramètres → S3, voir [`AWS-DOCUMENTS.md`](./AWS-DOCUMENTS.md) |
| Build échoue (mémoire) | RAM insuffisante | `NODE_OPTIONS=--max-old-space-size=2048 npm run build` ou VPS 4 Go |
| Certificat SSL expiré | Certbot | `certbot renew` |

Logs utiles :

```bash
pm2 logs sdcreativ --lines 100
sudo tail -f /var/log/nginx/error.log
sudo journalctl -u postgresql -n 50
```

---

## Sécurité VPS — checklist

- [x] SSH par clé, mot de passe root désactivé
- [x] UFW : ports 22, 80, 443 uniquement
- [x] PostgreSQL non exposé (localhost)
- [ ] `.env` en `chmod 600`
- [ ] `ADMIN_SECRET` fort et unique en prod
- [x] Mises à jour système régulières (`apt upgrade`)
- [x] Snapshots / sauvegardes PostgreSQL
- [ ] Fail2ban (optionnel) : `apt install fail2ban`

---

## Support

- Documentation Hostinger VPS : [support.hostinger.com](https://support.hostinger.com)
- Next.js self-hosting : [nextjs.org/docs/app/building-your-application/deploying](https://nextjs.org/docs/app/building-your-application/deploying)
- Documents S3 : [`AWS-DOCUMENTS.md`](./AWS-DOCUMENTS.md)
- Phase 2 CRM : [`PHASE-2.md`](./PHASE-2.md)
