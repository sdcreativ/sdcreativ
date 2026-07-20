# E2E CRM — login → devis → signature

Parcours Playwright : authentification CRM (bypass 2FA), création client + devis, PDF, puis signature espace client si S3 est configuré.

## Variables

À placer dans `.env.local` (jamais en production) :

| Variable | Rôle |
|----------|------|
| `ADMIN_SECRET` | Session CRM |
| `DATABASE_URL` | PostgreSQL |
| `CRM_E2E_EMAIL` | Compte CRM (ex. `admin@sdcreativ.com` après bootstrap) |
| `CRM_E2E_PASSWORD` | Mot de passe (bootstrap = valeur de `ADMIN_SECRET`) |
| `CRM_E2E_LOGIN_TOKEN` | Secret ≥ 32 caractères — bypass 2FA + OTP signature e2e en mémoire |
| `AWS_*` / `AWS_S3_BUCKET` | **Optionnel** — requis pour finaliser la signature portail (PDF signé S3) |

Sans `CRM_E2E_*`, le spec est **skippé** (CI smoke public inchangé).

**Ne jamais définir `CRM_E2E_LOGIN_TOKEN` sur le VPS / prod.**

## Commandes

```bash
# Build + serveur + spec CRM uniquement
npm run build && npm run test:e2e:crm

# Ou suite e2e complète (smoke + a11y + CRM si env présentes)
npm run test:e2e
```

## Ce qui est testé

1. `POST /api/admin/login` avec `e2eLoginToken` → session cookie (pas de 2FA)
2. UI `/admin/crm/devis`
3. Création client + accès portail + devis `sent`
4. `GET /api/admin/quotes/:id/pdf`
5. Si S3 : login espace client → challenge OTP → peek OTP e2e → signature → preuve CRM

## CI

Job optionnel `e2e-crm` : le job `e2e-crm-gate` teste la présence du secret `CRM_E2E_LOGIN_TOKEN` (les `secrets` ne sont pas utilisables dans `jobs.*.if`), puis `e2e-crm` ne tourne que si le gate sort `enabled=true`.
