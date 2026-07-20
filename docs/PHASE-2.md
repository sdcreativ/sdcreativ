# Phase 2 — Archive (historique)

> **Statut : archivé** (juillet 2026)  
> Ce document décrivait une roadmap early-stage (waitlist, kanban démo, auth MVP).  
> Il ne doit plus être utilisé comme plan produit.

---

## Où regarder maintenant

| Sujet | Document |
|-------|----------|
| Améliorations CRM en cours / faites | [`CRM-AMELIORATIONS.md`](./CRM-AMELIORATIONS.md) |
| Messagerie (hors sprint UI) | [`CRM-MESSAGERIE-PLAN.md`](./CRM-MESSAGERIE-PLAN.md) |
| Documents S3 | [`AWS-DOCUMENTS.md`](./AWS-DOCUMENTS.md) |
| Déploiement / Docker | [`DOCKER-PRODUCTION.md`](./DOCKER-PRODUCTION.md) |
| Cahier des charges réalisé | [`CAHIER-DES-CHARGES-REALISE.md`](./CAHIER-DES-CHARGES-REALISE.md) |

---

## État réel (remplace l’ancienne roadmap)

### Espace client (`/espace-client`)

Portail opérationnel : dashboard, projet, fichiers S3, paiements, factures, accès cookie/token.  
La waitlist `/api/waitlist` existe encore pour les inscriptions marketing, pas comme « Phase 2 produit ».

### CRM interne (`/admin/crm`)

Cycle agence en place : leads → opportunités → devis → clients → projets → factures / contrats, plus CMS (blog, site), rapports, charge commerciale, calendrier, tickets, temps, prestataires, inbox.  
Auth CRM via comptes `crm_users` (`/admin/login`), pas `ADMIN_SECRET` seul.

### Auth & config (obsolète dans ce fichier)

L’ancien snippet `ADMIN_SECRET` / Vercel ne reflète plus le déploiement actuel (VPS Docker + PostgreSQL + sessions CRM). Voir les docs déploiement ci-dessus.

### Anciennes « prochaines étapes » — devenues réalité ou reportées

1. ~~PostgreSQL pour leads / projets~~ — fait  
2. Auth clients — portail cookie / tokens (pas Clerk)  
3. Formulaires → CRM — sync contact / devis / waitlist  
4. Notifications — email (Resend), rappels calendrier, crons  

Messagerie IMAP/SMTP : code présent, UI derrière flag — voir plan messagerie.

---

## Contenu historique (conservé pour contexte)

Les sections ci-dessous sont **périmées** ; gardées uniquement pour traçabilité.

<details>
<summary>Ancien texte Phase 2 (ne pas suivre)</summary>

### Espace client (ancien)

- Suivi de projet en temps réel
- Documents (devis, contrats, livrables)
- Notifications email / WhatsApp
- **Statut alors** : page waitlist + formulaire `/api/waitlist`

### CRM interne (ancien)

- Pipeline prospects : kanban démo
- Leads PostgreSQL, documents S3
- **Statut alors** : kanban leads ; autres modules en cours

### Prochaines étapes techniques (ancien)

1. Base de données (PostgreSQL / Supabase)
2. Auth clients (magic link ou Clerk)
3. Webhooks Resend / formulaires → CRM
4. Notifications temps réel

</details>
