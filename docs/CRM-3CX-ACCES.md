# Accès 3CX — inventaire

> Template sans secrets. Compléter pendant / après Phase 1.  
> Ne jamais committer de mots de passe, tokens ou recovery codes.  
> Runbook : [`CRM-3CX-PHASE1.md`](./CRM-3CX-PHASE1.md) · Variables : `.env.example` (`THREE_CX_*`).

---

## Instance PBX

| Champ | Valeur |
|-------|--------|
| Hébergement | Hosted 3CX (MVP) |
| FQDN | _à renseigner_ → `THREE_CX_PBX_FQDN` |
| URL Management Console | `https://{FQDN}` |
| Édition / licence | Professional ou Enterprise Hosted |
| Fuseau PBX | Africa/Abidjan |
| Responsable admin | _nom / email interne_ |
| Date de mise en service | _AAAA-MM-JJ_ |

---

## Comptes

| Rôle | Identifiant (sans mot de passe) | Extension | Notes |
|------|----------------------------------|-----------|-------|
| System Owner / Admin | _email console_ | — | Accès Management Console uniquement |
| Agent commercial 1 | _email_ | 100 | Web Client + Live Chat |
| Agent commercial 2 | _email_ | 101 | Web Client + Live Chat |
| Escalade / direction | _email_ | 102 | Optionnel MVP |

Mots de passe et MFA : coffre-fort d’équipe (1Password / Bitwarden), jamais dans le repo ni Slack.

Quand ≥ 2 agents OK → `THREE_CX_CONFIRMED_AGENTS=2` dans l’env.

---

## Live Chat / Widget

| Champ | Valeur |
|-------|--------|
| Website Link / Chat ID | → `NEXT_PUBLIC_THREE_CX_LIVE_CHAT_LINK` |
| Département / file | Accueil commercial (`800`) |
| Langues widget | FR (prioritaire), EN |
| Message d’accueil | `THREECX_WIDGET_COPY` dans `src/lib/threecx/socle.ts` |
| Message hors ligne | idem |
| Click-to-Call audio | Oui (WebRTC) |
| Flag activation site | `NEXT_PUBLIC_THREE_CX_ENABLED=true` (après lien Live Chat valide) |
| FQDN public (si party seul) | `NEXT_PUBLIC_THREE_CX_PBX_FQDN` |
| Contournement horaires (dev) | `NEXT_PUBLIC_THREE_CX_IGNORE_HOURS=true` |

---

## Tests Phase 1

| Test | Date | OK | Notes |
|------|------|----|-------|
| T1 Chat → agent | | | |
| T2 Appel audio visiteur → agent | | | |
| T3 WebMeeting 100 ↔ 101 | | | |

Quand T1–T3 OK → `THREE_CX_CONSOLE_TESTS_PASSED=true` puis `npm run threecx:check`.

---

## Intégration CRM (Phases 3–4)

| Champ | Valeur |
|-------|--------|
| Token template CRM | → `THREE_CX_CRM_TOKEN` (secret serveur) |
| Endpoints attendus | `/api/integrations/3cx/*` |
| URL publique template | _à documenter après déploiement_ |

---

## Checklist opérationnelle

- [ ] FQDN renseigné dans `.env` / secrets de prod
- [ ] Au moins 2 agents peuvent se connecter au Web Client
- [ ] Live Chat testé (visiteur → file 800)
- [ ] Click-to-Call / appel audio testé
- [ ] WebMeeting testé (agent ↔ agent)
- [ ] Accès Admin limité (pas de partage du compte Owner)
- [ ] Rotation / inventaire des comptes revue annuellement
- [ ] `npm run threecx:check` → `ready: true`

---

## Références

- Plan : [`CRM-3CX-PLAN.md`](./CRM-3CX-PLAN.md)
- Runbook Phase 1 : [`CRM-3CX-PHASE1.md`](./CRM-3CX-PHASE1.md)
- Cadrage : `src/lib/threecx/cadrage.ts`
- Socle : `src/lib/threecx/socle.ts`
