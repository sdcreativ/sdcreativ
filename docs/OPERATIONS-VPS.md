# Exploitation VPS — sdcreativ.com

Guide opérationnel **après mise en ligne**. Commandes à réutiliser pour les mises à jour, vérifications et dépannage courant.

> Premier déploiement : [`DEPLOIEMENT-SDCREATIV-COM.md`](./DEPLOIEMENT-SDCREATIV-COM.md)  
> Checklist complète : [`VPS-POST-DEPLOIEMENT.md`](./VPS-POST-DEPLOIEMENT.md)  
> Runner GitHub (installation one-shot) : [`GITHUB-ACTIONS-RUNNER.md`](./GITHUB-ACTIONS-RUNNER.md)  
> Sécurité : [`VPS-SECURITE.md`](./VPS-SECURITE.md)

---

## Références rapides

| Élément | Valeur |
|---------|--------|
| Domaine | `sdcreativ.com` |
| VPS | `93.127.162.223` |
| Répertoire projet | `/var/www/sdcreativ` |
| SSH admin | `ssh root@93.127.162.223` |
| SSH déploiement | `ssh -i ~/.ssh/id_deploy_sdcreativ deploy@93.127.162.223` |
| Runner GitHub | `sdcreativ-vps` (self-hosted, utilisateur `deploy`) |

**Alias Compose** (à définir en début de session SSH) :

```bash
cd /var/www/sdcreativ
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod"
```

---

## 1. Mise à jour standard (code applicatif)

Flux habituel après des changements mergés sur `main`.

### Étape 1 — Sur votre Mac

```bash
cd /Users/user/Sites/localhost/sdcreativ
git status
git add …
git commit -m "…"
git push origin main
```

### Étape 2 — Déploiement automatique (recommandé)

1. GitHub → **Actions** → workflow **Deploy**
2. **Run workflow** → taper `deploy` → **Run workflow**
3. Attendre le job vert (s’exécute sur le runner **self-hosted** du VPS)

Le workflow lance :

```bash
bash /var/www/sdcreativ/scripts/vps-deploy-pull.sh
```

Ce script enchaîne : `git pull` → rebuild Docker `app` → bootstrap admin CRM → post-déploiement.

> **Prérequis one-shot** (déjà faits si tout fonctionne) : runner installé + Deploy key GitHub pour `deploy`. Voir [`GITHUB-ACTIONS-RUNNER.md`](./GITHUB-ACTIONS-RUNNER.md).

### Étape 2 bis — Déploiement manuel (SSH)

```bash
ssh -i ~/.ssh/id_deploy_sdcreativ deploy@93.127.162.223
cd /var/www/sdcreativ
./scripts/vps-deploy-pull.sh
```

Équivalent détaillé :

```bash
cd /var/www/sdcreativ
git pull --ff-only
$COMPOSE up -d --build app
./scripts/bootstrap-crm-admin.sh
./scripts/vps-post-deploy-check.sh
```

### Étape 3 — Vérification rapide

```bash
curl -I https://sdcreativ.com
$COMPOSE ps
```

Attendu : site en **200**, conteneur `app` **healthy**.

---

## 1 bis. Runner GitHub — commandes utiles

Vérifier que le runner est actif :

```bash
# Sur GitHub
# Settings → Actions → Runners → sdcreativ-vps → Idle (vert)

# Sur le VPS (deploy ou root)
sudo systemctl status 'actions.runner.*'
```

Redémarrer le runner :

```bash
su - deploy
cd ~/actions-runner
sudo ./svc.sh restart
```

Logs du runner :

```bash
journalctl -u 'actions.runner.*' -f
```

Si le job reste « Waiting for a runner » : runner offline → redémarrer le service ci-dessus.

---

## 2. Après modification des secrets (`.env.docker`)

Les secrets **ne sont pas** dans Git. Les modifier directement sur le VPS :

```bash
ssh root@93.127.162.223
cd /var/www/sdcreativ
nano .env.docker
```

Puis reconstruire et redémarrer l'application :

```bash
$COMPOSE up -d --build app
./scripts/vps-post-deploy-check.sh
```

Variables courantes : `ADMIN_SECRET`, `RESEND_API_KEY`, `DATABASE_URL`, `AWS_*`, `NEXT_PUBLIC_SITE_URL`.

---

## 3. Vérifications quotidiennes

### État des services

```bash
ssh root@93.127.162.223
cd /var/www/sdcreativ
$COMPOSE ps
```

Tous les services doivent être **Up** : `app`, `nginx`, `postgres`, `redis`, `certbot`.

### Script de contrôle automatique

```bash
./scripts/vps-post-deploy-check.sh
```

### Site & SSL

```bash
curl -I https://sdcreativ.com
curl -I http://sdcreativ.com          # → redirection vers HTTPS
dig sdcreativ.com +short              # → 93.127.162.223 uniquement
```

### CRM

Ouvrir : https://sdcreativ.com/admin/login

---

## 4. Consulter les logs

```bash
cd /var/www/sdcreativ
$COMPOSE logs -f app          # application Next.js
$COMPOSE logs -f nginx --tail 50
$COMPOSE logs -f postgres --tail 30
$COMPOSE logs -f certbot --tail 20
```

Quitter le suivi en temps réel : `Ctrl+C`.

---

## 5. Redémarrer un service

```bash
cd /var/www/sdcreativ

# Application seule (cas le plus fréquent)
$COMPOSE restart app

# Reverse proxy
$COMPOSE restart nginx

# Stack complète (maintenance)
$COMPOSE down
$COMPOSE up -d
```

---

## 6. Sauvegardes base de données

### Sauvegarde manuelle

```bash
cd /var/www/sdcreativ
BACKUP_DIR=/var/backups/sdcreativ \
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml" \
./scripts/db-backup.sh
```

### Installer le cron quotidien (une fois)

```bash
sudo BACKUP_DIR=/var/backups/sdcreativ ./scripts/install-backup-cron.sh
```

---

## 7. SSL / Certbot (si problème HTTPS)

Le renouvellement est automatique via le conteneur `certbot`. En cas d'échec :

```bash
cd /var/www/sdcreativ

# Vérifier que nginx répond sur le port 80
curl -I http://127.0.0.1
$COMPOSE ps nginx

# Renouveler manuellement
$COMPOSE run --rm --no-deps --entrypoint "\
  certbot renew --webroot -w /var/www/certbot" certbot

$COMPOSE exec nginx nginx -s reload
```

Réinstallation complète SSL (rare) :

```bash
./scripts/docker-prod-deploy.sh
```

---

## 8. Dépannage express

| Symptôme | Commandes |
|----------|-----------|
| Deploy GitHub en attente | `sudo systemctl status 'actions.runner.*'` → `sudo ./svc.sh restart` (en deploy) |
| `git pull` Permission denied (publickey) | Deploy key manquante → [`GITHUB-ACTIONS-RUNNER.md`](./GITHUB-ACTIONS-RUNNER.md) §4 |
| Site inaccessible | `$COMPOSE ps` puis `$COMPOSE logs nginx --tail 30` |
| Erreur 502 / app | `$COMPOSE logs app --tail 50` puis `$COMPOSE restart app` |
| Nginx en `Restarting` | `$COMPOSE logs nginx --tail 20` |
| Port 80 fermé | `ss -tlnp \| grep -E ':80\|:443'` et `ufw status` |
| Postgres exposé sur 5433 | `$COMPOSE up -d --force-recreate postgres` puis `docker ps` (pas de `0.0.0.0:5433`) |
| DNS incorrect | `dig sdcreativ.com +short` — une seule IP : `93.127.162.223` |

### Nginx ne démarre pas (`host not found in upstream app`)

Regénérer la config depuis le template du repo (après `git pull`) :

```bash
export DOMAIN=sdcreativ.com
envsubst '${DOMAIN}' < docker/nginx/conf.d/sdcreativ.conf.template > docker/nginx/conf.d/sdcreativ.conf
$COMPOSE up -d app
sleep 5
$COMPOSE up -d --force-recreate nginx
```

### Config HTTP temporaire (bootstrap SSL)

Si nginx refuse de démarrer faute de certificat :

```bash
export DOMAIN=sdcreativ.com
envsubst '${DOMAIN}' < docker/nginx/conf.d/sdcreativ.bootstrap.conf.template > docker/nginx/conf.d/sdcreativ.conf
$COMPOSE up -d --force-recreate nginx
```

Puis obtenir le certificat et repasser à la config complète (section 7).

---

## 9. Rollback rapide (version précédente)

```bash
cd /var/www/sdcreativ
git log --oneline -5                    # identifier le commit stable
git checkout <hash-commit-stable>
$COMPOSE up -d --build app
./scripts/vps-post-deploy-check.sh
```

Revenir sur `main` ensuite :

```bash
git checkout main
git pull origin main
```

---

## 10. Récapitulatif — commandes les plus utilisées

### Sur votre Mac (après dev)

```bash
cd /Users/user/Sites/localhost/sdcreativ
git push origin main
# Puis GitHub → Actions → Deploy → Run workflow → deploy
```

### Déploiement manuel (VPS)

```bash
ssh -i ~/.ssh/id_deploy_sdcreativ deploy@93.127.162.223
cd /var/www/sdcreativ
./scripts/vps-deploy-pull.sh
```

### Admin / maintenance (root)

```bash
ssh root@93.127.162.223
cd /var/www/sdcreativ
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod"

# Contrôle
$COMPOSE ps
curl -I https://sdcreativ.com
./scripts/vps-post-deploy-check.sh

# Logs
$COMPOSE logs -f app
```

### Runner GitHub

```bash
# Statut
sudo systemctl status 'actions.runner.*'

# Redémarrer
su - deploy -c 'cd ~/actions-runner && sudo ./svc.sh restart'
```

---

## Déploiement automatique — rappel

| Élément | Détail |
|---------|--------|
| Workflow | `.github/workflows/deploy.yml` |
| Déclenchement | Manuel — Actions → **Deploy** → `deploy` |
| Exécution | Runner **self-hosted** `sdcreativ-vps` sur le VPS |
| Script | `/var/www/sdcreativ/scripts/vps-deploy-pull.sh` |
| Secrets SSH (`VPS_HOST`, etc.) | **Plus utilisés** — voir [`GITHUB-ACTIONS-RUNNER.md`](./GITHUB-ACTIONS-RUNNER.md) |

Installation initiale du runner (une seule fois) : [`GITHUB-ACTIONS-RUNNER.md`](./GITHUB-ACTIONS-RUNNER.md).
