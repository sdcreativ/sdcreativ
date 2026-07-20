# Plan technique — Messagerie CRM (emails Hostinger)

**Objectif :** lire et traiter les emails clients dans le CRM SD CREATIV via IMAP/SMTP Hostinger, sans remplacer Resend (emails transactionnels).

**Prérequis déjà en place :**
- [x] Boîtes Hostinger Premium Business Email (`@sdcreativ.com`)
- [x] Resend pour invitations, 2FA, factures, formulaires
- [x] Onboarding équipe (email perso + accès boîte pro)
- [x] S3 pour pièces jointes documents (réutilisable)
- [x] Page CRM **Inbox** existante = fil d’activité (tickets, leads, tâches) — **ne pas confondre** avec la messagerie email

**Nom de la feature :** **Messagerie** (`/admin/crm/messagerie`) — distinct de `/admin/crm/inbox`.

**Serveurs Hostinger (référence) :**
| Protocole | Serveur | Port |
|-----------|---------|------|
| IMAP | `imap.hostinger.com` | 993 SSL |
| SMTP | `smtp.hostinger.com` | 465 SSL / 587 STARTTLS |
| Webmail | `https://webmail.hostinger.com` | — |

---

## Principes

1. **Resend ≠ conversationnel** — Resend reste pour le transactionnel ; Hostinger pour lire/répondre aux clients.
2. **Phase 1 = lecture seule** sur `contact@` avant toute réponse SMTP.
3. **Mots de passe mail** chiffrés au repos (jamais en clair en base).
4. **Une boîte partagée d’abord** (`contact@`), puis boîtes individuelles.
5. Cocher chaque case **après validation manuelle** (pas seulement « code poussé »).

---

## Phase 0 — Cadrage & sécurité

**Durée estimée :** 0,5–1 jour  
**Statut :** ✅ réalisée (2026-07-16)

### Décisions figées (go)

| Sujet | Décision |
|-------|----------|
| Boîte v1 | `contact@sdcreativ.com` uniquement |
| Compte sync dédié | Non — réutiliser `contact@` |
| Libs | IMAP `imapflow`, SMTP `nodemailer` (install Phase 1) |
| Chiffrement | AES-256-GCM, clé `MAIL_CREDENTIALS_SECRET` (≥32 car.) |
| Permissions | `mail.read` / `mail.write` / `mail.manage` |
| Rôles (lecture/réponse) | admin (tout), commercial, sales_director, project_manager ; readonly = lecture seule |
| Sync par défaut | `MAIL_SYNC_ENABLED=0` jusqu’à Phase 1 |

### DNS / coexistence Resend + Hostinger

- **MX** → Hostinger (`mx1` / `mx2.hostinger.com`) — réception
- **SPF** → un seul TXT : `include:_spf.mail.hostinger.com` **et** include Resend (ex. `amazonses.com` / valeur du dashboard)
- **DKIM** → Hostinger (`hostingermail-*`) **et** `resend._domainkey` — ne pas écraser l’un par l’autre
- **DMARC** → conserver `_dmarc` (`p=none` au minimum)

### Limites Hostinger (rappel)

Voir `HOSTINGER_MAIL_LIMITS` dans `src/lib/mail/config.ts` : cron ≥ 2–5 min, 1 connexion IMAP à la fois, auth = email complet + MDP boîte.

### Checklist Phase 0

- [x] Décider boîte(s) synchronisée(s) en v1 : `contact@sdcreativ.com` uniquement
- [x] Créer un compte mail dédié sync (optionnel) ou utiliser `contact@` — **retenu : contact@**
- [x] Définir rôles CRM autorisés à voir la Messagerie
- [x] Choisir lib IMAP (`imapflow`) + SMTP (`nodemailer`)
- [x] Définir chiffrement AES-256-GCM + `MAIL_CREDENTIALS_SECRET`
- [x] Documenter limites Hostinger
- [x] Valider coexistence SPF/DKIM Resend + MX Hostinger (règles documentées)
- [x] Secrets prévus dans `.env.example` / `.env.docker.example` / `.env.production.example`
- [x] Module `src/lib/mail/config.ts` + `src/lib/mail/crypto.ts` + tests
- [x] Santé intégrations CRM : carte « Messagerie (Hostinger) »

**Livrable Phase 0 :** note go / no-go + scaffolding sécurité

- [x] Phase 0 validée (code) — **action ops :** générer et coller `MAIL_CREDENTIALS_SECRET` dans `.env.docker` avant Phase 1

**Go Phase 1 si :** `MAIL_CREDENTIALS_SECRET` ≥ 32 caractères en prod.  
**No-go sync :** ne pas mettre `MAIL_SYNC_ENABLED=1` avant tables + cron Phase 1.

---

## Phase 1 — Sync IMAP lecture seule (`contact@`)

**Durée estimée :** 1,5–2,5 semaines

### 1.1 Schéma base de données

- [x] Table `crm_mailboxes`
  - `id`, `email`, `display_name`, `imap_host`, `imap_port`, `smtp_host`, `smtp_port`
  - `credentials_encrypted`, `active`, `last_sync_at`, `last_uid`, `last_error`, `user_id` (Phase 4)
  - `created_at`, `updated_at`
- [x] Table `crm_mail_threads`
  - `id`, `mailbox_id`, `subject`, `snippet`, `participants` (jsonb)
  - `last_message_at`, `unread_count`, `client_id`, `lead_id`
  - `status` (`open` | `archived`), `created_at`, `updated_at`
- [x] Table `crm_mail_messages`
  - `id`, `thread_id`, `mailbox_id`, `message_id` (unique par boîte)
  - `uid`, `folder`, `from_address`, `to_addresses`, `cc_addresses`
  - `subject`, `body_text`, `body_html`, `received_at`, `direction` (`inbound` | `outbound`)
  - `in_reply_to`, `raw_headers`, `created_at`
  - contraintes uniques `(mailbox_id, message_id)` et `(mailbox_id, folder, uid)`
- [x] Table `crm_mail_attachments`
  - `id`, `message_id`, `filename`, `content_type`, `size_bytes`, `s3_key`
- [x] Index : mailbox/uid, thread/received_at, client/lead, attachments
- [x] Migration dans `src/lib/db.ts` (`CREATE IF NOT EXISTS`)
- [x] Types `src/lib/mail/types.ts` + repository / mappers `src/lib/mail/repository.ts`

**Livrable 1.1 :** schéma prêt au boot app (ensureSchema). Suite → Phase 1.2 (IMAP sync).

### 1.2 Backend sync

- [x] Module `src/lib/mail/crypto.ts` — encrypt / decrypt credentials *(livré en Phase 0)*
- [x] Module `src/lib/mail/imap-client.ts` — connexion IMAP Hostinger (`imapflow` + `mailparser`)
- [x] Module `src/lib/mail/sync.ts` — fetch UID depuis `last_uid`, upsert messages + threads
- [x] Règle de threading : `In-Reply-To` / `References` puis fallback sujet + participants (`threading.ts`)
- [x] Job cron `GET /api/cron/mail-sync` (auth `CRON_SECRET`, respect `MAIL_SYNC_ENABLED`)
- [x] Gestion erreurs : timeout, auth fail → log + `mailbox.last_error`
- [x] Variables documentées : `MAIL_CREDENTIALS_SECRET`, `MAIL_SYNC_ENABLED` (`.env*.example`)
- [x] Dépendances : `imapflow`, `mailparser` (+ `@types/mailparser`) — `nodemailer` reporté Phase 2
- [x] Tests unitaires threading + crypto

**Cron VPS (après `MAIL_SYNC_ENABLED=1` + boîte configurée) :**
```bash
# Toutes les 5 minutes
*/5 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://VOTRE_DOMAINE/api/cron/mail-sync >/dev/null
```

**Ops manuel (créer la boîte puis sync) :**
```bash
# POST /api/admin/mail/mailboxes  { "password": "…", "email": "contact@sdcreativ.com" }
# POST /api/admin/mail/mailboxes/{id}/sync
```

### 1.3 API admin

- [x] `GET /api/admin/mail/mailboxes` — liste boîtes configurées
- [x] `POST /api/admin/mail/mailboxes` — ajouter boîte (admin/`mail.manage`, credentials chiffrés ; v1 = `contact@` seul)
- [x] `POST /api/admin/mail/mailboxes/[id]/sync` — sync manuel (ignore `MAIL_SYNC_ENABLED`)
- [x] `GET /api/admin/mail/threads` — liste (filtres unread, search, status) + `unreadCount`
- [x] `GET /api/admin/mail/threads/[id]` — détail + messages + PJ (+ mark-read par défaut)
- [x] Permissions : `mail.read` / `mail.write` / `mail.manage` *(catalogue livré Phase 0)*
- [x] Client `src/lib/mail-api.ts`

### 1.4 UI Messagerie

- [x] Route `/admin/crm/messagerie` + entrée nav (label **Messagerie**, icône Mail)
- [x] Vue liste : threads, aperçu, date, badge non lu
- [x] Vue détail : fil de messages (lecture seule, drawer)
- [x] Bouton « Synchroniser »
- [x] État vide + erreurs sync visibles
- [x] Mobile : liste puis détail (drawer comme tickets)

### 1.5 Validation Phase 1

- [x] Critère « ≥ 20 mails » automatisé (`getMailPhase1Validation` + UI / API) — **à atteindre en ops** via Synchroniser / cron
- [x] Pièces jointes listées (métadonnées) — téléchargement S3 reporté Phase 2
- [x] Aucune fuite de mot de passe dans logs / API responses (`sanitizeMailError`, mappers, tests)
- [x] Cron documenté dans `docs/DOCKER-PRODUCTION.md` + `scripts/install-mail-sync-cron.sh` / `check-mail-messagerie.sh`

**Outils validation :**
- UI : bandeau checklist sur `/admin/crm/messagerie`
- API : `GET /api/admin/mail/validation`
- Santé Paramètres : carte Messagerie reflète `validation.go`
- VPS : `./scripts/check-mail-messagerie.sh`

**Livrable Phase 1 :** lecture seule opérationnelle sur `contact@`

- [ ] Phase 1 validée — cocher quand `validation.go === true` (secret + boîte + ≥20 messages)

---

## Phase 2 — Réponses SMTP depuis le CRM

**Durée estimée :** 1–2 semaines  
**Statut :** ✅ code livré (2026-07-16) — validation ops = envoi réel reçu côté client

- [x] Module `src/lib/mail/smtp-client.ts` (nodemailer → `smtp.hostinger.com`)
- [x] `POST /api/admin/mail/threads/[id]/reply` — corps texte/HTML, In-Reply-To / References
- [x] Enregistrement message `direction = outbound` après envoi OK (folder `CRM-OUT`)
- [x] UI : zone de réponse + envoi + états loading/erreur
- [x] Brouillons (`crm_mail_drafts`, 1 par thread+user) — autosave UI + purge à l’envoi
- [x] Signature email (branding CRM + contact site public)
- [ ] Test ops : réponse reçue correctement côté client + thread regroupé

**Livrable Phase 2 :** répondre depuis le CRM via la boîte `contact@`

- [ ] Phase 2 validée — cocher après un aller-retour réel Hostinger

---

## Phase 3 — Liaison email ↔ client / lead

**Durée estimée :** ~1 semaine  
**Statut :** ✅ code livré (2026-07-16)

- [x] Matching auto : `from_address` ∈ clients/leads (casse + alias `+tag` via `normalizeMatchEmail`)
- [x] UI : associer manuellement un thread à un client ou lead (`MailThreadLinkControls`)
- [x] Sur fiche client : section **Emails (messagerie)**
- [x] Sur fiche lead : même principe
- [x] Action « Créer un lead / ticket depuis ce mail »
- [x] Tests matching (casse, alias `+tag`, domaines)

**Livrable Phase 3 :** historique mail visible sur la fiche client

- [ ] Phase 3 validée — cocher après un matching réel en prod

---

## Phase 4 — Boîtes individuelles (commerciaux)

**Durée estimée :** 1–2 semaines  
**Statut :** ✅ code livré (2026-07-16)

- [x] Associer `crm_mailboxes.user_id` → membre CRM (`upsertMailbox`)
- [x] Sync multi-boîtes dans le cron (séquentiel, 1 IMAP à la fois)
- [x] Filtre Messagerie : « Ma boîte » / « contact@ » / « Toutes » (+ autres boîtes admin)
- [x] Onboarding : « Connecter au CRM » (bandeau MDP + option invite admin)
- [x] Ne jamais logger le MDP ; rotation = resaisie UI (Messagerie)
- [x] Quota / santé : dernière sync OK par boîte (carte Paramètres)

**Livrable Phase 4 :** chaque commercial voit sa boîte pro dans le CRM

- [ ] Phase 4 validée — cocher après connexion d’au moins une boîte commerciale en prod

---

## Phase 5 — Temps réel (Agentic Mail) — optionnel

**Durée estimée :** 3–5 jours  
**Statut :** ✅ code livré (2026-07-16)

- [x] Webhook Hostinger Agentic Mail `message.received` → `POST /api/webhooks/hostinger-mail`
- [x] Vérification Bearer `HOSTINGER_MAIL_WEBHOOK_SECRET`
- [x] Sync incrémentale UID (`syncMailboxByEmail`, limit 20 — pas re-fetch complet)
- [x] Fallback cron documenté (`MAIL_SYNC_ENABLED` + `install-mail-sync-cron.sh`)
- [x] Doc config hPanel : `docs/DOCKER-PRODUCTION.md` § Webhook Agentic Mail

**Livrable Phase 5 :** nouveaux mails visibles en &lt; ~30 s sans attendre le cron

- [ ] Phase 5 validée — cocher après Test webhook hPanel + mail réel reçu en &lt; 30 s  
  *(sinon laisser le cron seul = Phase 5 reportée côté ops)*

---

## Hors scope (volontairement)

- [ ] ~~Remplacer Resend~~ — hors scope
- [ ] ~~Création automatique de boîtes Hostinger via API~~ — pas disponible aujourd’hui
- [ ] ~~Client mail complet type Gmail (labels avancés, règles complexes)~~ — v2+
- [ ] ~~Fusion avec `/admin/crm/inbox` activité~~ — garder séparés

---

## Checklist variables d’environnement

À ajouter progressivement dans `.env.docker` / `.env.docker.example` :

- [x] `MAIL_CREDENTIALS_SECRET=` (documenté — à renseigner en prod)
- [x] `MAIL_SYNC_ENABLED=0` (documenté)
- [x] `MAIL_IMAP_HOST=imap.hostinger.com`
- [x] `MAIL_IMAP_PORT=993`
- [x] `MAIL_SMTP_HOST=smtp.hostinger.com`
- [x] `MAIL_SMTP_PORT=465`
- [x] Credentials boîte stockés en DB chiffrés (API crypto prête ; table Phase 1)
- [x] `HOSTINGER_MAIL_WEBHOOK_SECRET=` (Phase 5 — Bearer Agentic Mail)

---

## Checklist permissions CRM

- [x] Permission `mail.read`
- [x] Permission `mail.write` (réponses)
- [x] Permission `mail.manage` (ajouter / éditer boîtes — admin)
- [x] Matrice rôles mise à jour (defaults + merge admin / rôles système au boot)

---

## Ordre de réalisation recommandé

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5?
              │            │            │
           lecture      répondre     fiche client
```

**Prochaine action concrète :** démarrer le schéma BDD Phase 1.1 + installer `imapflow`.

---

## Suivi

| Phase | Statut | Date validation | Notes |
|-------|--------|-----------------|-------|
| 0 Cadrage | ✅ | 2026-07-16 | Secret à coller en `.env.docker` avant sync |
| 1 Lecture IMAP | 🟡 1.1 ✅ | 2026-07-16 | Schéma BDD OK — suite 1.2 sync IMAP |
| 2 Réponses SMTP | ☐ | | |
| 3 Lien client/lead | ☐ | | |
| 4 Boîtes individuelles | ☐ | | |
| 5 Agentic Mail | ☐ / reporté | | |

*Dernière mise à jour : 2026-07-16*
