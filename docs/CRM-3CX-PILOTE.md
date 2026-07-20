# Pilote 3CX ↔ CRM — checklist ops

> Objectif : passer du **code livré** (Phases 0–8) à un **canal live** chat + appels sur sdcreativ.com.  
> Sans secrets dans ce fichier. Compléter [CRM-3CX-ACCES.md](./CRM-3CX-ACCES.md).

---

## État code vs ops

| Zone | Code | Ops |
|------|------|-----|
| Widget Live Chat + horaires Abidjan | ✅ | [ ] Activer en prod |
| APIs `/api/integrations/3cx/*` | ✅ | [ ] Token + allowlist |
| Screen-pop CRM | ✅ | [ ] Template console 3CX |
| Journal Communications | ✅ | [ ] Migration `0008` appliquée |
| RGPD / DPA Hosted | Mentions privacy | [ ] DPA 3CX accepté |
| Tests T1–T3 console | Scripts | [ ] Exécutés |

---

## Jour J — ordre d’exécution

### 1. Provisionnement PBX (Phase 1)

1. Obtenir le **FQDN** Hosted → `THREE_CX_PBX_FQDN` + `NEXT_PUBLIC_THREE_CX_PBX_FQDN`
2. Créer ≥ **2 agents** (ext. 100 / 101) + file **800** Accueil commercial
3. Configurer Live Chat → copier le **Website Link** → `NEXT_PUBLIC_THREE_CX_LIVE_CHAT_LINK`
4. Coller messages d’accueil / offline depuis `getThreeCxWidgetCopyForConsole()` (`src/lib/threecx/socle.ts`)
5. Renseigner [CRM-3CX-ACCES.md](./CRM-3CX-ACCES.md) (sans mots de passe)

### 2. Tests console

| ID | Test | OK |
|----|------|----|
| T1 | Chat visiteur → agent file 800 | [ ] |
| T2 | Appel audio WebRTC visiteur → agent | [ ] |
| T3 | WebMeeting agent 100 ↔ 101 | [ ] |

Puis dans `.env` prod :

```bash
THREE_CX_CONFIRMED_AGENTS=2
THREE_CX_CONSOLE_TESTS_PASSED=true
```

```bash
npm run threecx:check
```

### 3. Intégration CRM

1. Générer `THREE_CX_CRM_TOKEN` (secret long) — **jamais** en `NEXT_PUBLIC_*`
2. Optionnel : `THREE_CX_IP_ALLOWLIST` (IPs egress 3CX)
3. Brancher le template CRM 3CX (lookup / create / journal) — voir [CRM-3CX-API.md](./CRM-3CX-API.md)
4. Vérifier screen-pop : agent connecté au CRM → fiche lead/client

### 4. Activation site

1. `NEXT_PUBLIC_THREE_CX_ENABLED=true`
2. Rebuild / redeploy Docker (vars `NEXT_PUBLIC_*` figées au build)
3. Tester sur `/contact` et une page services (heures ouvrées Abidjan)
4. Hors horaires : Assistant IA + CTA RDV (Option A Phase 7)

### 5. Conformité (Phase 8)

- [ ] DPA / CG 3CX Hosted acceptés
- [ ] Décider enregistrement : si oui → `NEXT_PUBLIC_THREE_CX_RECORDING_NOTICE=true` + mention Live Chat
- [ ] Process interne accès / effacement journal CRM

---

## Go / No-go

**GO** si :

- `npm run threecx:check` vert  
- T1–T3 OK  
- Widget visible en heures ouvrées  
- Lookup + création lead test OK  
- DPA traité (ou risque accepté par écrit)

**NO-GO** : laisser `NEXT_PUBLIC_THREE_CX_ENABLED=false` et continuer l’IA seule.

---

## Commandes utiles

```bash
npm run threecx:check
npm run threecx:loadtest -- --base https://sdcreativ.com --token "$THREE_CX_CRM_TOKEN" --n 40 --concurrency 5
```

Runbooks détaillés : [CRM-3CX-PHASE1.md](./CRM-3CX-PHASE1.md) · [CRM-3CX-PHASE8.md](./CRM-3CX-PHASE8.md) · plan [CRM-3CX-PLAN.md](./CRM-3CX-PLAN.md).
