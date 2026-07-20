# GitHub Actions — runner self-hosted (VPS)

Le déploiement SSH depuis les runners GitHub cloud (`ubuntu-latest`) échoue souvent sur Hostinger avec **`dial tcp :22: i/o timeout`** : le pare-feu laisse passer votre IP, pas les datacenters GitHub.

**Solution :** un runner **self-hosted** installé **sur le VPS**. GitHub communique en **sortie** depuis le serveur ; plus besoin d’SSH entrant depuis GitHub.

> Voir aussi : [`DEPLOIEMENT-SDCREATIV-COM.md`](./DEPLOIEMENT-SDCREATIV-COM.md) · [`VPS-SECURITE.md`](./VPS-SECURITE.md)

---

## Architecture

```
GitHub (workflow Deploy)
       ↓  (connexion sortante HTTPS)
Runner self-hosted sur le VPS (utilisateur deploy)
       ↓
scripts/vps-deploy-pull.sh  →  git pull + docker compose + checks
```

Le workflow **CI** (`ci.yml`) reste sur `ubuntu-latest` (lint, build, tests).  
Seul **Deploy** utilise le runner VPS.

---

## Installation (one-shot sur le VPS)

### 1. Prérequis

En **root** :

```bash
usermod -aG docker deploy
chown -R deploy:deploy /var/www/sdcreativ
chmod +x /var/www/sdcreativ/scripts/*.sh
```

Vérifier en **deploy** :

```bash
su - deploy
groups                    # doit contenir docker
cd /var/www/sdcreativ && git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod ps
```

### 2. Token GitHub

1. Ouvrir **https://github.com/sdcreativ/sdcreativ/settings/actions/runners**
2. **New self-hosted runner** → **Linux**
3. Copier le **token** (valide ~1 heure, usage unique)

### 3. Installer le runner

Toujours en **deploy** :

```bash
cd /var/www/sdcreativ
chmod +x scripts/install-github-runner.sh
GITHUB_RUNNER_TOKEN=COLLER_LE_TOKEN_ICI ./scripts/install-github-runner.sh
```

Si le runner est déjà configuré (erreur « already configured ») :

```bash
cd ~/actions-runner
sudo ./svc.sh install deploy
sudo ./svc.sh start
```

### 4. Accès GitHub pour `git pull` (obligatoire)

L'utilisateur **deploy** doit pouvoir lire le repo :

```bash
cd /var/www/sdcreativ
chmod +x scripts/setup-deploy-git-access.sh
./scripts/setup-deploy-git-access.sh
```

Ou manuellement : générer une clé SSH, l'ajouter en **Deploy key** (lecture seule) sur  
https://github.com/sdcreativ/sdcreativ/settings/keys

### 5. Vérifier

- GitHub → **Settings → Actions → Runners** → runner `sdcreativ-vps` en **Idle** (point vert)
- Sur le VPS :

```bash
sudo systemctl status 'actions.runner.*'
```

---

## Lancer un déploiement

1. Pousser le code sur `main`
2. GitHub → **Actions** → workflow **Deploy**
3. **Run workflow** → confirmer avec `deploy`

Le job s’exécute sur le VPS et lance `/var/www/sdcreativ/scripts/vps-deploy-pull.sh`.

---

## Déploiement manuel (équivalent)

```bash
ssh -i ~/.ssh/id_deploy_sdcreativ deploy@93.127.162.223
cd /var/www/sdcreativ
./scripts/vps-deploy-pull.sh
```

---

## Maintenance du runner

| Action | Commande (en deploy) |
|--------|----------------------|
| Statut service | `sudo systemctl status 'actions.runner.*'` |
| Logs | `journalctl -u 'actions.runner.*' -f` |
| Redémarrer | `cd ~/actions-runner && sudo ./svc.sh restart` |
| Mettre à jour le runner | GitHub → Runners → ⋮ → Update (ou réinstaller le script) |

### Désinstaller

```bash
cd ~/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh uninstall
./config.sh remove --token NOUVEAU_TOKEN_RETRAIT
```

(Token de retrait : GitHub → Runners → runner → Remove)

---

## Dépannage

| Problème | Cause / solution |
|----------|------------------|
| Job reste en attente « Waiting for a runner » | Runner offline → `sudo ./svc.sh start` |
| `permission denied` docker | `usermod -aG docker deploy` + reconnecter deploy |
| `Permission denied (publickey)` sur git pull | deploy sans Deploy key GitHub | `./scripts/setup-deploy-git-access.sh` |
| `git pull` échoue | Droits sur `/var/www/sdcreativ` → `chown -R deploy:deploy` |
| Runner absent après reboot | `sudo systemctl enable 'actions.runner.*'` (svc.sh le fait normalement) |

---

## Secrets GitHub (SSH) — optionnels

Les secrets `VPS_HOST`, `VPS_SSH_KEY`, `VPS_SSH_USER` ne sont **plus utilisés** par le workflow Deploy.  
Vous pouvez les garder pour un usage manuel ou les supprimer.

---

*Dernière mise à jour : juillet 2026*
