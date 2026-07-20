# Technologies — SD CREATIV

Stack et modules utilisés pour construire la plateforme SD CREATIV : site public, CRM interne, espace client et automatisations.

---

## Frontend & application

| Domaine | Technologie |
|---------|-------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Langage | TypeScript |
| UI | React 19, [Tailwind CSS v4](https://tailwindcss.com/) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Icônes | [Lucide React](https://lucide.dev/) |
| Graphiques CRM | [Recharts](https://recharts.org/) |
| Validation | [Zod](https://zod.dev/) |

---

## Backend & données

| Domaine | Technologie |
|---------|-------------|
| API | Routes API Next.js |
| Base de données | [PostgreSQL](https://www.postgresql.org/) |
| Accès SQL | `pg` (requêtes typées) |

---

## Services & intégrations

| Domaine | Technologie |
|---------|-------------|
| Emails transactionnels | [Resend](https://resend.com/) |
| Stockage documents | [AWS S3](https://aws.amazon.com/s3/) |
| CMS (optionnel) | [Sanity](https://www.sanity.io/) |
| Monitoring (optionnel) | [Sentry](https://sentry.io/) |
| SMS rappels (optionnel) | Twilio |
| Calendrier | OAuth Google / Microsoft, feed iCal |

---

## Infrastructure

| Domaine | Technologie |
|---------|-------------|
| Production recommandée | VPS (Nginx, PM2) + PostgreSQL local |
| Fichiers clients | AWS S3 |
| CI | GitHub Actions |
| SSL | Let's Encrypt |

> Procédure de mise en production : [`PROCEDURE-PRODUCTION-COMPLETE.md`](./PROCEDURE-PRODUCTION-COMPLETE.md)

---

## Modules métier

| Module | Description |
|--------|-------------|
| **Site vitrine** | Services, réalisations, blog, contact, devis en ligne |
| **CRM** (`/admin/crm`) | Leads, clients, projets, devis, factures, tâches, tickets, calendrier, rapports |
| **Espace client** | Suivi de projet, documents, factures |
| **Auth CRM** | Multi-utilisateurs, rôles & permissions, 2FA, invitations par email |

---

## Documentation associée

| Document | Sujet |
|----------|--------|
| [`PROCEDURE-PRODUCTION-COMPLETE.md`](./PROCEDURE-PRODUCTION-COMPLETE.md) | Déploiement production |
| [`DEPLOIEMENT-VPS-HOSTINGER.md`](./DEPLOIEMENT-VPS-HOSTINGER.md) | VPS Hostinger |
| [`AWS-DOCUMENTS.md`](./AWS-DOCUMENTS.md) | Stockage S3 |
| [`CRM-AUDIT-IMPLEMENTATION.md`](./CRM-AUDIT-IMPLEMENTATION.md) | État du CRM |
| [`CRM-ROLES-PERMISSIONS.md`](./CRM-ROLES-PERMISSIONS.md) | Rôles & permissions |

*Dernière mise à jour : juillet 2026*
