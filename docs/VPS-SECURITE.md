# Sécurité VPS — sdcreativ.com (Hostinger)

Procédures pour durcir le VPS de production **SD CREATIV** : pare-feu, SSH, sauvegardes, Docker et bonnes pratiques opérationnelles.

> Voir aussi : [`DEPLOIEMENT-SDCREATIV-COM.md`](./DEPLOIEMENT-SDCREATIV-COM.md) · [`OPERATIONS-VPS.md`](./OPERATIONS-VPS.md) · [`VPS-POST-DEPLOIEMENT.md`](./VPS-POST-DEPLOIEMENT.md)

**Stack rappel :** Ubuntu + Docker Compose (Next.js, PostgreSQL, Redis, Nginx, Certbot). Seuls les ports **22**, **80** et **443** doivent être publics.

---

## État de référence (déjà en place)

| Mesure | Description |
|--------|-------------|
| Pare-feu Hostinger | Règles Accepter TCP 22, 80, 443 + Drop en dernier |
| UFW | Actif, aligné sur 22 / 80 / 443 |
| HTTPS | Let's Encrypt via Certbot |
| Réseau Docker | App et Postgres non exposés sur l'hôte (prod) |
| CRM | RBAC par rôle, changement de mot de passe obligatoire au 1er login |

---

## 1. Pare-feu Hostinger (hPanel)

**Chemin :** hPanel → VPS → **Pare-feu**

Ajouter ces règles **dans cet ordre**, **au-dessus** de la règle `Drop / Any / Any` :

| # | Action | Protocole | Port | Source |
|---|--------|-----------|------|--------|
| 1 | Accepter | TCP | 22 | N'importe où |
| 2 | Accepter | TCP | 80 | N'importe où |
| 3 | Accepter | TCP | 443 | N'importe où |
| 4 | Drop | Any | Any | N'importe où *(déjà présente — la garder en dernier)* |

**Notes :**

- Choisir **TCP** explicitement (pas laisser « Sélectionner… »).
- **N'importe où** est requis pour que **GitHub Actions** puisse se connecter en SSH (runners dans des datacenters AWS/Azure).
- Attendre 1–2 minutes après enregistrement avant de tester.

**Vérification depuis votre machine :**

```bash
nc -zv VOTRE_IP_VPS 22
nc -zv VOTRE_IP_VPS 443
```

---

## 2. Pare-feu UFW (sur le VPS)

UFW et le pare-feu Hostinger se cumulent : les deux doivent autoriser les mêmes ports.

### Vérifier l'état

```bash
ufw status numbered
```

Résultat attendu (IPv4 et IPv6) :

- `22/tcp` ou `OpenSSH` → ALLOW
- `80/tcp` → ALLOW
- `443/tcp` → ALLOW
- Statut : **active**

### Configurer ou corriger

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

### Désactiver UFW (dépannage uniquement)

Si vous suspectez un conflit pendant un diagnostic :

```bash
ufw disable
# … test …
ufw enable
```

En production, préférez **garder UFW actif** et aligné avec Hostinger.

---

## 3. Durcir SSH

> **Important :** gardez **une session SSH ouverte** pendant toute modification de `sshd`. Testez dans un **second terminal** avant de fermer la première session.

### 3.1 Clé SSH (obligatoire avant de couper les mots de passe)

Sur **votre Mac**, si ce n'est pas déjà fait :

```bash
ssh-keygen -t ed25519 -C "votre-email" -f ~/.ssh/id_sdcreativ_vps
ssh-copy-id -i ~/.ssh/id_sdcreativ_vps.pub root@VOTRE_IP_VPS
ssh -i ~/.ssh/id_sdcreativ_vps root@VOTRE_IP_VPS
```

### 3.2 Modifier la configuration SSH

Sur le VPS :

```bash
nano /etc/ssh/sshd_config
```

Ajuster ou ajouter :

```text
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
```

Appliquer (Ubuntu / Debian — le service s'appelle **`ssh`**, pas `sshd`) :

```bash
sshd -t && systemctl reload ssh
# ou : service ssh reload
```

Vérifier le nom du service si besoin :

```bash
systemctl status ssh
```

Tester dans un **nouveau terminal** :

```bash
ssh -i ~/.ssh/id_sdcreativ_vps root@VOTRE_IP_VPS
```

### 3.3 Clé dédiée pour GitHub Actions

1. Sur le VPS, ajouter la clé publique du secret `VPS_SSH_KEY` dans `/root/.ssh/authorized_keys` (ou user `deploy` — voir §4).
2. GitHub → repo → **Settings → Secrets → Actions** :
   - `VPS_HOST` = IP du VPS (ex. `93.127.162.223`)
   - `VPS_SSH_KEY` = clé privée complète (`-----BEGIN…` / `-----END…`)
   - `VPS_SSH_USER` = `root` ou `deploy` (optionnel)

Ne réutilisez **pas** votre clé personnelle pour le déploiement automatique.

---

## 4. Utilisateur non-root pour le déploiement (recommandé)

```bash
adduser deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
# Copier votre clé publique :
nano /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

Donner les droits sudo limités (déploiement uniquement) :

```bash
visudo -f /etc/sudoers.d/deploy
```

Contenu exemple :

```text
deploy ALL=(ALL) NOPASSWD: /usr/bin/git, /usr/bin/docker
```

Changer la propriété du projet :

```bash
chown -R deploy:deploy /var/www/sdcreativ
```

Mettre à jour le secret GitHub `VPS_SSH_USER=deploy` et adapter le workflow si les chemins sudo diffèrent.

---

## 5. Fail2ban (anti-bruteforce SSH)

```bash
apt update
apt install -y fail2ban
systemctl enable --now fail2ban
fail2ban-client status sshd
```

Configuration minimale (optionnelle) :

```bash
nano /etc/fail2ban/jail.local
```

```ini
[sshd]
enabled = true
port = ssh
maxretry = 5
bantime = 3600
findtime = 600
```

```bash
systemctl restart fail2ban
fail2ban-client status sshd
```

---

## 6. Mises à jour automatiques de sécurité

```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

Choisir **Yes**. Vérifier :

```bash
cat /etc/apt/apt.conf.d/20auto-upgrades
```

Les mises à jour **Docker** et **rebuild app** restent manuelles ou via le workflow Deploy.

---

## 7. Secrets et permissions fichiers

### Fichiers sensibles sur le VPS

| Fichier | Rôle |
|---------|------|
| `/var/www/sdcreativ/.env` | Compose, Postgres, domaine |
| `/var/www/sdcreativ/.env.docker` | Secrets app (JWT, Resend, S3, admin…) |

```bash
cd /var/www/sdcreativ
chmod 600 .env .env.docker
chown root:root .env .env.docker   # ou deploy:deploy si user dédié
```

### Règles

- Ne **jamais** commiter `.env` / `.env.docker`.
- `ADMIN_SECRET` = mot de passe temporaire bootstrap admin uniquement ; les utilisateurs CRM ont leur propre mot de passe.
- En cas de fuite suspectée : rotation immédiate des secrets + redémarrage des conteneurs.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod up -d --force-recreate app
```

---

## 8. Vérifier l'exposition des ports Docker

Seul **Nginx** doit écouter sur l'hôte (80/443).

```bash
cd /var/www/sdcreativ
docker ps --format "table {{.Names}}\t{{.Ports}}"
ss -tlnp | grep -E ':5432|:6379|:3000|:3001'
```

**Attendu :**

- `nginx` → `0.0.0.0:80`, `0.0.0.0:443`
- `app`, `postgres`, `redis` → ports internes Docker ou `127.0.0.1` uniquement, **pas** `0.0.0.0:5432`

Si Postgres est exposé publiquement, retirer le mapping de port dans Compose et redémarrer.

---

## 9. Sauvegardes PostgreSQL

### Sauvegarde manuelle

```bash
cd /var/www/sdcreativ
mkdir -p /var/backups/sdcreativ
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U sdcreativ sdcreativ | gzip > /var/backups/sdcreativ/pg-$(date +%F-%H%M).sql.gz
ls -lh /var/backups/sdcreativ/
```

### Cron quotidien (exemple 3h00)

```bash
crontab -e
```

```cron
0 3 * * * cd /var/www/sdcreativ && docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres pg_dump -U sdcreativ sdcreativ | gzip > /var/backups/sdcreativ/pg-$(date +\%F).sql.gz
```

### Rétention (garder 14 jours)

```cron
15 3 * * * find /var/backups/sdcreativ -name 'pg-*.sql.gz' -mtime +14 -delete
```

Copier périodiquement les dumps vers **S3** ou un autre stockage externe (hors du VPS).

### Restauration (test sur environnement de test d'abord)

```bash
gunzip -c /var/backups/sdcreativ/pg-YYYY-MM-DD.sql.gz | \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres \
  psql -U sdcreativ sdcreativ
```

---

## 10. Sécurité application CRM

| Action | Procédure |
|--------|-----------|
| 2FA admin | CRM → **Paramètres → Sécurité** → activer la 2FA pour les comptes admin |
| Rôles | **Paramètres → Équipe → Rôles** — principe du moindre privilège |
| Journal connexions | API `/api/admin/login-logs` (rôle `users.manage`) |
| Mot de passe bootstrap | Changer `ADMIN_SECRET` dans `.env.docker` après première utilisation |

---

## 11. Surveillance et maintenance

### Connexions SSH suspectes

```bash
grep -E "Failed password|Invalid user" /var/log/auth.log | tail -30
last -20
```

### Espace disque

```bash
df -h
docker system df
docker system prune -f   # prudence : supprime images/conteneurs inutilisés
```

### Logs application

```bash
cd /var/www/sdcreativ
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f --tail=100 app nginx
```

### Monitoring externe (gratuit)

- [UptimeRobot](https://uptimerobot.com) ou équivalent : ping `https://sdcreativ.com` + alerte email.

---

## 12. Déploiement sécurisé (GitHub Actions)

Workflow : `.github/workflows/deploy.yml`

**Méthode recommandée : runner self-hosted** sur le VPS (pas de SSH entrant depuis GitHub cloud — évite les timeouts Hostinger). Guide complet : [`GITHUB-ACTIONS-RUNNER.md`](./GITHUB-ACTIONS-RUNNER.md).

**Installation one-shot (utilisateur deploy) :**

```bash
cd /var/www/sdcreativ
GITHUB_RUNNER_TOKEN=TOKEN_GITHUB ./scripts/install-github-runner.sh
```

**Lancement :** GitHub → Actions → **Deploy** → Run workflow → saisir `deploy`.

**Déploiement manuel équivalent :**

```bash
ssh -i ~/.ssh/id_deploy_sdcreativ deploy@VOTRE_IP_VPS
cd /var/www/sdcreativ
./scripts/vps-deploy-pull.sh
```

---

## 13. À ne pas faire

| ❌ | Pourquoi |
|----|----------|
| Exposer Postgres (5432) sur Internet | Accès direct à toutes les données CRM |
| Exposer l'app Next.js (3000) sans Nginx | Pas de SSL, pas de rate limit |
| `PasswordAuthentication yes` + root en prod | Bruteforce trivial |
| Désactiver Hostinger **et** UFW sans remplacement | Serveur ouvert |
| Commiter secrets ou clés SSH | Fuite via GitHub |
| Règle Hostinger SSH « Mon IP » seulement | Bloque GitHub Actions |

---

## Checklist rapide

```
[ ] Hostinger : TCP 22, 80, 443 (Accepter) + Drop en dernier
[ ] UFW : 22, 80, 443 ALLOW
[ ] SSH : clés uniquement, PasswordAuthentication no
[ ] fail2ban actif
[ ] unattended-upgrades activé
[ ] .env / .env.docker en chmod 600
[ ] docker ps : pas de 5432/6379/3000 sur 0.0.0.0
[ ] Backup Postgres cron + copie externe
[ ] 2FA activée sur comptes admin CRM
[ ] Runner self-hosted GitHub (deploy) installé — voir GITHUB-ACTIONS-RUNNER.md
[ ] Monitoring uptime configuré
```

---

## Dépannage déploiement GitHub Actions

| Symptôme | Cause probable | Action |
|----------|----------------|--------|
| `Waiting for a runner` | Runner VPS offline | `sudo systemctl status 'actions.runner.*'` puis redémarrer |
| `dial tcp …:22: i/o timeout` | SSH cloud → Hostinger bloqué | Utiliser le runner self-hosted (§12) |
| `permission denied` docker | deploy hors groupe docker | `usermod -aG docker deploy` |
| `git pull` échoue | Droits sur `/var/www/sdcreativ` | `chown -R deploy:deploy /var/www/sdcreativ` |

---

*Dernière mise à jour : juillet 2026 — VPS Hostinger KVM, Ubuntu, Docker Compose SD CREATIV.*
