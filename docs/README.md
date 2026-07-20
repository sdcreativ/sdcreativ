# Documentation SD CREATIV

Runbooks et plans **versionnés** (sans secrets). Les mots de passe, tokens et clés restent dans `.env` / coffre-fort.

## Démarrage rapide

| Besoin | Doc |
|--------|-----|
| Déploiement Docker / VPS | [DOCKER-PRODUCTION.md](./DOCKER-PRODUCTION.md), [DEPLOIEMENT-VPS-HOSTINGER.md](./DEPLOIEMENT-VPS-HOSTINGER.md) |
| Post-déploiement | [VPS-POST-DEPLOIEMENT.md](./VPS-POST-DEPLOIEMENT.md) |
| Email Resend | [RESEND-EMAIL.md](./RESEND-EMAIL.md) |
| Documents S3 | [AWS-DOCUMENTS.md](./AWS-DOCUMENTS.md) |
| Améliorations CRM (roadmap) | [CRM-AMELIORATIONS.md](./CRM-AMELIORATIONS.md) |

## 3CX (pilote)

| Doc | Rôle |
|-----|------|
| **[CRM-3CX-PILOTE.md](./CRM-3CX-PILOTE.md)** | Checklist ops pour lancer le pilote |
| [CRM-3CX-PLAN.md](./CRM-3CX-PLAN.md) | Plan Phases 0–8 |
| [CRM-3CX-ACCES.md](./CRM-3CX-ACCES.md) | Inventaire FQDN / agents (sans secrets) |
| [CRM-3CX-PHASE1.md](./CRM-3CX-PHASE1.md) | Runbook console + Live Chat |
| [CRM-3CX-PHASE8.md](./CRM-3CX-PHASE8.md) | RGPD, monitoring, support |

```bash
npm run threecx:check
```

## PDF (smoke prod)

```bash
npm run smoke:pdf
# Conteneur Docker :
docker compose exec app node scripts/smoke-pdf.mjs
```

Voir aussi [SMOKE-PDF.md](./SMOKE-PDF.md).

## Messagerie (pause UI)

| Doc | Rôle |
|-----|------|
| [CRM-MESSAGERIE-PLAN.md](./CRM-MESSAGERIE-PLAN.md) | Plan IMAP/SMTP Hostinger |

## Présentation tablette

Captures et specs sous `presentation-tablet/` — hors parcours deploy critique.
