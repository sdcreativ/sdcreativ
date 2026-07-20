# Phase 8 — Qualité, conformité, prod

Livrables code + checklists ops pour mettre 3CX ↔ CRM en production en confiance.

---

## 1. Checklist RGPD

Constante code : `THREECX_RGPD_CHECKLIST` (`src/lib/threecx/compliance.ts`).

| # | Item | Statut |
|---|------|--------|
| 1 | Finalités (chat, appels, journal CRM, suivi commercial) documentées | Privacy `privacy-policy.ts` |
| 2 | Bases légales (précontractuel + intérêt légitime journal) | Idem |
| 3 | Conservation CRM `communication_events` ≤ 3 ans | Idem + `THREECX_CRM_JOURNAL_RETENTION_YEARS` |
| 4 | DPA / conditions sous-traitance **3CX Hosted** acceptées | [ ] Ops / juridique |
| 5 | Minimisation logs API (pas de contenu chat / token) | `logThreeCxRequest` + `reportThreeCxError` |
| 6 | Droits d’accès / effacement (process interne CRM) | [ ] Ops |

---

## 2. Mention « conversation peut être enregistrée »

1. Activer l’enregistrement **uniquement** si cadre légal OK (consentement / intérêt légitime + info claire).
2. Mettre `NEXT_PUBLIC_THREE_CX_RECORDING_NOTICE=true` (rebuild Docker si besoin).
3. Recoller le greeting Live Chat depuis `getThreeCxWidgetCopyForConsole()` (`socle.ts`) — la mention FR/EN est ajoutée automatiquement.
4. L’Assistant IA (mode handoff) affiche aussi la notice lorsque le flag est on.

Si l’enregistrement est **désactivé** sur le PBX : laisser le flag à `false`.

---

## 3. Secrets

| Variable | Où | Interdit |
|----------|-----|----------|
| `THREE_CX_CRM_TOKEN` | `.env.docker`, secrets CI / VPS | `NEXT_PUBLIC_*`, git, tickets |
| `THREE_CX_IP_ALLOWLIST` | serveur | — |
| Lien Live Chat / FQDN | `NEXT_PUBLIC_*` OK (public) | — |

Vérif : `npm run threecx:check` refuse un token présent dans une variable `NEXT_PUBLIC_*`.

---

## 4. Monitoring Sentry

Les routes `/api/integrations/3cx/*` appellent `reportThreeCxError` (tag `integration=3cx`, `threecx_route=…`) en cas d’exception.

Prérequis : `SENTRY_DSN` / config Next déjà en place (`instrumentation.ts`).

Alerter sur : pics 500, 401 massifs, 429 prolongés.

---

## 5. Runbook support

### Widget ne charge pas

1. `NEXT_PUBLIC_THREE_CX_ENABLED=true` + rebuild  
2. Lien Live Chat valide (`NEXT_PUBLIC_THREE_CX_LIVE_CHAT_LINK`)  
3. Heures ouvrées Abidjan (ou `IGNORE_HOURS` en test)  
4. Page prioritaire (`isThreeCxPriorityPath`)  
5. Console navigateur : blocage script CDN `callus.js` / adblock  
6. `npm run threecx:check`

### Agent offline / pas de réponse

1. Agent connecté Web Client + file **800**  
2. Statut « Available »  
3. Messages d’accueil / offline collés (Phase 1)  
4. Tester un second agent

### Lookup / screen-pop échoue

1. Agent connecté au **CRM** (cookie session)  
2. URL screen-pop PME correcte (Phase 4)  
3. `THREE_CX_CRM_TOKEN` + Bearer (édition PRO)  
4. Allowlist IP si configurée  
5. Logs serveur `[3cx]` + Sentry tag `threecx_route`  
6. Téléphone normalisé (digits CI)

### Journal vide dans Communications

1. Édition PME : journal auto limité — template XML = PRO  
2. Migration `0008` appliquée  
3. Retry : même `external_id` → pas de doublon (idempotence)

---

## 6. Tests de charge légers

```bash
npm run threecx:loadtest -- --base https://sdcreativ.com --token "$THREE_CX_CRM_TOKEN" --n 40 --concurrency 5
```

- **Uniquement** `GET …/contacts/lookup`  
- **Jamais** `POST …/contacts` ni journal (évite la création de leads)  
- Au-delà de ~120 req/min/IP → 429 attendu (rate-limit)

---

## 7. Déploiement staging → prod + pilote

### Staging

- [ ] Env 3CX staging (ou flag widget off)  
- [ ] Migration `0008`  
- [ ] Screen-pop / token selon édition  
- [ ] `threecx:check` + `threecx:loadtest` (lookup)  
- [ ] Parcours : chat, appel, handoff IA, fiche CRM

### Prod

- [ ] Pull + rebuild Docker (`NEXT_PUBLIC_*` au **build**)  
- [ ] `.env.docker` : FQDN, lien chat, token, recording notice si besoin  
- [ ] Coller URL screen-pop PME dans console 3CX  
- [ ] Smoke : 1 chat + 1 appel + Web Client header CRM  
- [ ] Sentry : filtre `integration:3cx` OK

### Pilote métier (1 semaine)

- [ ] ≥ 2 agents répondent en heures ouvrées  
- [ ] Leads 3CX visibles / scoring OK  
- [ ] Aucun incident bloquant widget / CRM  
- [ ] Revue RGPD DPA 3CX cochée  
- [ ] Décision go / adjust (click-to-call optionnel Phase 5)

---

## 7bis. Pilote instance `1229.3cx.cloud` (PME — sdcreativ.com)

Édition **PME** → prioriser **screen-pop** (Phase 4A). Le `THREE_CX_CRM_TOKEN` reste utile pour tests lookup / futur PRO, pas pour le journal auto PME.

### A. Env prod (`.env.docker`)

Cible recommandée :

```bash
THREE_CX_PBX_FQDN=1229.3cx.cloud
NEXT_PUBLIC_THREE_CX_PBX_FQDN=1229.3cx.cloud
NEXT_PUBLIC_THREE_CX_LIVE_CHAT_LINK=https://1229.3cx.cloud/callus/#sdcreativ
NEXT_PUBLIC_THREE_CX_ENABLED=true
NEXT_PUBLIC_THREE_CX_IGNORE_HOURS=false
NEXT_PUBLIC_THREE_CX_WEB_CLIENT_URL=https://1229.3cx.cloud
NEXT_PUBLIC_THREE_CX_RECORDING_NOTICE=false
THREE_CX_CONFIRMED_AGENTS=2
THREE_CX_CONSOLE_TESTS_PASSED=true   # après T1–T3
THREE_CX_CRM_TOKEN=<régénéré — serveur uniquement>
# THREE_CX_IP_ALLOWLIST=             # optionnel
```

- [ ] Retirer `THREECX_AI_HANDOFF_PLAYBOOK` (pas une variable d’env)  
- [ ] Passer `THREE_CX_CONFIRMED_AGENTS` à **2** (2ᵉ agent Web Client)  
- [ ] Régénérer `THREE_CX_CRM_TOKEN` s’il a fuité (chat / ticket / log)  
- [ ] Rebuild Docker après tout changement `NEXT_PUBLIC_*`

### B. Console 3CX (`1229.3cx.cloud`)

- [ ] Live Chat party **sdcreativ** → file **800**  
- [ ] Agents **100–102** (au moins 2 Available en heures ouvrées)  
- [ ] Messages FR collés (`getThreeCxWidgetCopyForConsole` / Phase 1)  
- [ ] Intégration CRM personnalisée — URL :

```text
https://sdcreativ.com/admin/crm/3cx-pop?phone=%CallerNumber%&name=%CallerDisplayName%
```

Informer lorsque : **Sonnerie**

### C. App / CRM

- [ ] Migration `0008_3cx_communications` appliquée en prod  
- [ ] Site public (lun–ven 8h–18h Abidjan) : bulle 3CX sur Accueil / Contact / Devis…  
- [ ] IA : mode handoff + CTA « Ouvrir le chat conseiller »  
- [ ] Hors horaires : pas de 3CX, IA propose RDV + WhatsApp  
- [ ] CRM header : **Web Client 3CX** → `https://1229.3cx.cloud`  
- [ ] `/admin/crm/communications` + widget dashboard stats accessibles

### D. Smoke jour J (30 min)

| # | Test | OK |
|---|------|----|
| 1 | Chat visiteur → agent file 800 | [ ] |
| 2 | Appel audio visiteur → agent | [ ] |
| 3 | Appel numéro **connu** → screen-pop fiche | [ ] |
| 4 | Appel numéro **inconnu** → lead `call_3cx` prérempli | [ ] |
| 5 | Agent ouvre Web Client depuis le CRM | [ ] |
| 6 | Handoff IA → clic ouvre / focus 3CX | [ ] |
| 7 | (Optionnel) `npm run threecx:loadtest -- --base https://sdcreativ.com --token "$THREE_CX_CRM_TOKEN" --n 20` | [ ] |

### E. Semaine pilote

| Jour | Focus |
|------|--------|
| J+1–2 | Au moins 1 agent dispo 8h–18h ; noter incidents widget / offline |
| J+3–4 | Vérifier leads `call_3cx` / `live_chat_3cx` + Communications |
| J+5 | WebMeeting interne (lien dans un RDV calendrier) |
| J+7 | Revue : DPA 3CX [ ] · go / adjust · `THREE_CX_CONSOLE_TESTS_PASSED=true` |

Critères go : 0 blocage widget, screen-pop fiable, ≥ 2 agents formés, pas de secret dans les logs.

---

## Fichiers

| Fichier | Rôle |
|---------|------|
| `src/lib/threecx/compliance.ts` | Checklist + notice enregistrement + secrets |
| `src/lib/threecx/observability.ts` | Sentry |
| `scripts/loadtest-threecx-api.mjs` | Charge légère |
| `docs/CRM-3CX-PHASE8.md` | Ce runbook |
