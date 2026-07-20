# Améliorations CRM — SD CREATIV

> Dernière mise à jour : 19 juillet 2026  
> Cocher `[x]` chaque item dès sa réalisation.  
> Messagerie : **reportée** — voir aussi `docs/CRM-MESSAGERIE-PLAN.md`.  
> **3CX** (Live Chat + appels + CRM) : plan dédié dans [`docs/CRM-3CX-PLAN.md`](./CRM-3CX-PLAN.md).

---

## Contexte

Le CRM couvre déjà un cycle agence complet (leads → devis → clients → projets → facturation + CMS).  
Les items ci-dessous ciblent les **écarts de polish**, la **robustesse data/perf**, et les **modules encore légers** — pas un nouveau cœur métier.

### Canal relationnel 3CX (plan séparé)

- [ ] **Intégration 3CX Phone / Live Chat ↔ CRM**  
  Widget public, appels audio (visiteurs) + audio/vidéo navigateur (équipe), création leads, journalisation, stats.  
  *Suivi détaillé :* [`CRM-3CX-PLAN.md`](./CRM-3CX-PLAN.md) — Phases 0–8 **code faits**.  
  *Pilote ops (P0) :* [`CRM-3CX-PILOTE.md`](./CRM-3CX-PILOTE.md) · check `npm run threecx:check`.

### Signature électronique (dual)

- **Native SD CREATIV v2** (preuve métier renforcée) : OTP email + canvas + SHA-256 PDF + journal `signature_events`. Devis portail + contrats (lien magique).  
  *Code :* `src/lib/signature/`, migration `0005_signature_v2.sql`.  
  *Ne pas présenter comme eIDAS qualifiée / équivalent Yousign.*
- **Yousign** : option « forte valeur » sur les contrats uniquement (`YOUSIGN_API_KEY`). Exclusion mutuelle avec une demande native déjà envoyée.

---

## Priorité 1 — Fort impact

- [x] **Pipeline Opportunités (Deals) actionnable**  
  Passer de la vue lecture seule à un vrai pipeline : kanban / actions, deep-links vers fiches lead/devis/client/projet, projet « principal » déterministe (éviter le fan-out multi-projets).  
  *Fichiers :* `src/components/admin/CrmDealsView.tsx`, `src/lib/deals.ts`

- [x] **Endpoints agrégés dashboard**  
  Remplacer le chargement de listes complètes côté client par des agrégats API (KPIs, compteurs, top N).  
  *Fichiers :* `src/components/admin/CrmDashboard.tsx`, API reports / dashboard

- [x] **Pagination stricte des listes lourdes**  
  Éviter les fallbacks type `pageSize: 10_000` sur clients/leads ; pagination + filtres serveur partout.  
  *Fichiers :* `src/lib/clients.ts`, `src/lib/leads.ts`, vues associées

- [x] **Migrations versionnées**  
  Sortir du `ensureSchema()` monolithique runtime vers des migrations versionnées (Drizzle / SQL files / équivalent).  
  *Fichier :* `src/lib/db.ts`

---

## Priorité 2 — Valeur métier & homogénéité

### Modules à remonter au niveau Leads / Paramètres

- [x] **Temps (timesheets) — polish produit**  
  Empty states, feedback d’erreur, UX de saisie/édition alignée sur le reste du CRM.  
  *Fichier :* `src/components/admin/CrmTimesheetsView.tsx`

- [x] **Prestataires — CRUD complet**  
  Édition prestataires + bons de commande (création, statut, liaison projet/marge).  
  *Fichier :* `src/components/admin/CrmVendorsView.tsx`

- [x] **Inbox — gestion d’erreurs & feedback**  
  Ne plus avaler les erreurs silencieusement ; messages utilisateur + états vides clairs.  
  *Fichier :* `src/components/admin/CrmInboxView.tsx`

- [x] **Documents — polish UX**  
  Empty states, filtres et feedback au niveau des vues cœur commercial.  
  *Fichier :* `src/components/admin/CrmDocumentsView.tsx`

- [x] **Marketing — polish UX**  
  Homogénéiser empty states, erreurs et parcours avec Leads / Paramètres.  
  *Fichier :* `src/components/admin/CrmMarketingView.tsx`

### Permissions & navigation

- [x] **Permissions dédiées modules périphériques**  
  Droits propres pour calendrier, marketing, vendors, timesheets, deals (ne plus proxy via `leads.read` / `projects.read` / `null`).  
  *Fichiers :* `src/lib/crm-permissions.ts`, `src/lib/crm-access.ts`, matrice rôles

- [x] **Navigation regroupée**  
  Grouper la sidebar (~20 entrées) : Commercial / Ops / Contenu / Admin pour réduire la charge cognitive.  
  *Fichier :* `src/content/crm-nav.ts`

### Modèle de données

- [x] **Normaliser l’assignation sur `assignee_id`**  
  UI/API uniquement sur la FK `crm_users` ; déprécier / retirer le VARCHAR `assignee` après backfill.  
  *Tables / libs :* leads, tasks, tickets, projects, etc.

- [x] **Extraire l’équipe projet hors metadata**  
  Table relationnelle `project_team_members` (rôle, user, dates).  
  *Fichiers :* `src/lib/project-team.ts`, détail projet

- [x] **Extraire l’échéancier paiements hors metadata**  
  Table `project_payment_milestones` (montant, échéance, statut).  
  *Fichier :* `ProjectPaymentScheduleEditor` / libs projets

- [x] **Lignes devis / factures requêtables**  
  Évaluer tables relationnelles (ou vues) pour lignes JSONB — reporting comptable et filtres plus fiables.

- [x] **Contraintes de statut en base**  
  CHECK / enums sur les VARCHAR de statut encore non stricts (cohérence data hors app).

---

## Priorité 3 — Différenciation & scale

- [x] **Signature électronique tierce**  
  Yousign (API v3) pour contrats : envoi PDF, webhook `signature_request.done`, schéma `0004_priority3_esign`.  
  Env : `YOUSIGN_API_KEY`, `YOUSIGN_WEBHOOK_SECRET`. DocuSign non retenu (contexte FR/CI).  
  *Réf. :* `docs/AUDIT-FONCTIONNALITES.md`

- [x] **PDF server-side (Playwright / Chromium)**  
  Routes devis / factures / rapports via `htmlToPdfResponse` ; aperçu `?format=html` ; fallback HTML si Chromium absent.

- [x] **Vue charge de travail commerciale**  
  `/admin/crm/charge` + `GET /api/admin/workload` : leads, devis, pipeline, tâches, relances par commercial.

- [x] **Pièces jointes mail → S3**  
  Sync IMAP upload S3 (≤ 5 Mo) ; métadonnées + `s3_key` ; validation mail mise à jour.  
  *Fichier :* `src/lib/mail/validation.ts`

---

## Plus tard — Messagerie

> Volontairement **hors sprint** pour l’instant. Le code existe ; l’UI reste derrière le flag.

- [ ] **Réactiver l’UI messagerie**  
  Flag `CRM_MESSAGERIE_ENABLED` / `NEXT_PUBLIC_CRM_MESSAGERIE_ENABLED=1`, nav `ready: true`.  
  *Fichiers :* `src/content/crm-nav.ts`, `src/lib/mail/config.ts`, `src/components/admin/CrmMessagerieView.tsx`

- [ ] **Stabiliser sync & onboarding mailbox**  
  Sync fiable, banner d’onboarding, gestion d’erreurs Hostinger / IMAP.  
  *Réf. :* `docs/CRM-MESSAGERIE-PLAN.md`

- [ ] **Raccorder Inbox ↔ fils mail**  
  Quand la messagerie est active, enrichir l’inbox unifiée avec les threads email.

---

## Dette & docs

- [x] **Aligner / archiver `docs/PHASE-2.md`**  
  Document archivé : pointe vers `CRM-AMELIORATIONS.md` et l’état réel (portail + CRM complets).

- [x] **Nettoyer `CrmComingSoon`**  
  Fallback `[section]` limité aux nav `ready: false` ; badge « Phase 2 » retiré ; copy messagerie.

- [x] **Homogénéiser les clients API**  
  Helpers `projects-api` (équipe / échéancier), `marketing-api` (séquences), `career-applications-api`, `legal-entities-api`, `api-keys-api` ; Dialog sur contrats & révocation clés.

---

## Hors scope (volontaire)

Ces sujets restent hors cœur métier pour l’instant :

- [ ] ERP complet (achats, stock, paie)
- [ ] CRM social / publicité
- [ ] IA générative omniprésente (garder des cas ciblés uniquement)
- [ ] Remplacement du CMS PostgreSQL par Sanity

---

## Ordre suggéré

```
Deals actionnable → Dashboard agrégé + pagination
  → Polish Temps / Prestataires / Inbox
  → Permissions dédiées + nav groupée
  → Migrations versionnées + normalisation assignee / metadata
  → (plus tard) Messagerie
```

### Top 3 recommandés (hors messagerie)

1. [x] Pipeline Opportunités actionnable
2. [x] Dashboard agrégé + pagination listes
3. [x] Prestataires / Temps / Inbox au niveau polish Leads

---

## Journal des réalisations

| Date | Item | Commit / note |
|------|------|---------------|
| 2026-07-17 | Priorité 1 complète | Deals kanban + actions, `GET /api/admin/dashboard`, pagination `paginateAll`, migrations SQL `migrations/` |
| 2026-07-17 | Priorité 2 complète | Polish modules, perms dédiées, nav groupée, `0003_priority2_schema`, assignee_id, team/paiements/lignes |
| 2026-07-17 | Priorité 3 complète | Yousign contrats, PDF Playwright admin, vue Charge, PJ mail → S3 |
| 2026-07-17 | Dette & docs | Archive `PHASE-2.md`, ComingSoon resserré, clients API homogénéisés |
| 2026-07-17 | Signature SD CREATIV v2 | OTP email, audit trail, PDF scellé (devis + contrats) ; Yousign conservé |

---

*Cocher les cases à chaque livraison et renseigner le journal.*
