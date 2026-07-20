# Smoke PDF production

Vérifie que **Chromium** génère un vrai PDF (pas un fallback HTML).

## Prérequis

- Image Docker runner avec Chromium (`Dockerfile` : `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser`)
- Ou Chromium local + `CHROMIUM_EXECUTABLE_PATH`

## Commandes

```bash
# Local / CI
npm run smoke:pdf

# Sur le VPS (compose)
docker compose -f docker-compose.prod.yml exec app node scripts/smoke-pdf.mjs
```

Exit code `0` = PDF OK (`%PDF-`). Exit `1` = échec (souvent Chromium absent).

## Contrôles manuels CRM

Après un deploy réussi :

1. CRM → **Devis** → ouvrir un devis → bouton PDF → le navigateur doit afficher le **lecteur PDF** (pas une page HTML pleine largeur).
2. CRM → **Factures** → idem.
3. CRM → **Contrats RH** → **Voir PDF** → idem + logo visible dans l’en-tête.
4. Si un ancien contrat était archivé en HTML : recliquer **Voir PDF** ou **Archiver S3** pour régénérer.

## Dépannage

| Symptôme | Action |
|----------|--------|
| Page HTML au lieu du PDF | Rebuild image avec Chromium ; vérifier `CHROMIUM_EXECUTABLE_PATH` |
| Logo manquant | Logo embarqué en data-URI depuis `public/images/logo.png` — régénérer l’archive |
| Timeout Playwright | Mémoire Docker insuffisante ; augmenter `shm_size` ou RAM du conteneur `app` |

## CI

Le job quality peut exécuter `npm run smoke:pdf` si Chromium est installé (voir `ci.yml`). En local sans Chromium, le script échoue volontairement pour éviter un faux positif.
