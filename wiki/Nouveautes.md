# Nouveautés

Fonctionnalités marquées récentes (juillet 2026).

### Inbox unifiée · _Récent_

> File de travail groupée (tickets, mails, relances).

**Explication**

Centralise les éléments à traiter. Liste densifiée et regroupée par jour pour traiter plus vite.

**Fonctionnement**

Inbox → parcourir les groupes du jour → ouvrir un élément. Si un fil messagerie est lié, basculez vers Messagerie depuis l’item.

**Lien :** [/admin/crm/inbox](https://sdcreativ.com/admin/crm/inbox)

**Captures**

![Inbox unifiée — inbox.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/inbox.png)

---

### Badges compteurs (nav & cloche) · _Récent_

> Compteurs non lus / à traiter sur la navigation.

**Explication**

Signaux visuels sur Inbox, tâches, notifications, etc., pour prioriser sans ouvrir chaque module.

**Fonctionnement**

Les badges se mettent à jour automatiquement. La cloche ouvre le panneau de notifications (les lues sont masquées).

**Captures**

![Badges compteurs (nav & cloche) — inbox.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/inbox.png)

![Badges compteurs (nav & cloche) — dashboard.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/dashboard.png)

---

### Opt-in marketing (lead) · _Récent_

> Consentement marketing pour les campagnes promo.

**Explication**

En plus (ou à la place) de la newsletter, ce flag autorise l’inclusion du lead dans l’audience des campagnes de relance.

**Fonctionnement**

Fiche lead → cocher « Opt-in marketing », ou à la création du lead. Les devis tièdes liés deviennent éligibles aux campagnes.

**Lien :** [/admin/crm/leads](https://sdcreativ.com/admin/crm/leads)

**Captures**

![Opt-in marketing (lead) — leads.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/leads.png)

---

### Création projet préremplie · _Récent_

> Nom, assigné et aperçu client préremplis depuis le client.

**Explication**

Réduit les erreurs et accélère le démarrage d’un projet.

**Fonctionnement**

Depuis un client → Nouveau projet → vérifier les champs préremplis → enregistrer.

**Lien :** [/admin/crm/clients](https://sdcreativ.com/admin/crm/clients)

**Captures**

![Création projet préremplie — clients_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/clients_02.png)

---

### Présentation tablette · _Récent_

> Parcours salon / bureau avec brief CRM.

**Explication**

Mode démo terrain : slides + capture du brief prospect renvoyé vers le CRM (lead).

**Fonctionnement**

Ouvrir Présentation tablette → choisir parcours salon ou bureau → présenter → finaliser le brief (lead créé / enrichi).

**Lien :** [/presentation](https://sdcreativ.com/presentation)

**Captures**

![Présentation tablette — presentation.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/presentation.png)

![Présentation tablette — presentation_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/presentation_02.png)

---

### Click-to-call · _Récent_

> Appel en un clic depuis un numéro CRM.

**Explication**

Déclenche l’appel via l’intégration téléphonie (3CX) depuis leads / contacts.

**Fonctionnement**

Sur une fiche avec téléphone → bouton d’appel → l’appel part via 3CX.

**Lien :** [/admin/crm/leads](https://sdcreativ.com/admin/crm/leads)

**Captures**

![Click-to-call — leads.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/leads.png)

![Click-to-call — communications-3cx.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/communications-3cx.png)

---

### Campagnes de relance promotionnelles · _Récent_

> Offre garantie datée sur devis tièdes + opt-in (sans loterie).

**Explication**

Relance commerciale excitante : offre limitée dans le temps, CTA « Je suis intéressé », puis tâche pour le commercial. Opt-in = newsletter active OU flag lead.

**Fonctionnement**

Marketing → Campagnes → créer (nom, offre, dates) → Activer → Sync audience → Envoyer emails. Le destinataire ouvre `/promo/[token]` → confirme → tâche + notif CRM. Cron optionnel : `/api/cron/promo-campaigns`.

**Lien :** [/admin/crm/marketing](https://sdcreativ.com/admin/crm/marketing)

**Captures**

![Campagnes de relance promotionnelles — marketing-campagnes-promo.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/marketing-campagnes-promo.png)

---

### PDF devis (logo & Chromium) · _Récent_

> PDF A4 réel avec identité société embarquée.

**Explication**

Génération via Playwright/Chromium dans Docker ; logo et mentions société cohérents avec les paramètres.

**Fonctionnement**

Depuis un devis → aperçu / télécharger PDF. En prod, smokes post-deploy vérifient la chaîne PDF.

**Lien :** [/admin/crm/devis](https://sdcreativ.com/admin/crm/devis)

**Captures**

![PDF devis (logo & Chromium) — devis.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/devis.png)

---

### Signature devis (OTP / audit) · _Récent_

> Signature électronique SD CREATIV v2.

**Explication**

Parcours sécurisé (OTP), journal d’audit ; le lead lié passe en Signé.

**Fonctionnement**

Client reçoit le lien de signature → OTP → signe. Le CRM met à jour devis + lead.

**Lien :** [/admin/crm/devis](https://sdcreativ.com/admin/crm/devis)

**Captures**

![Signature devis (OTP / audit) — devis.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/devis.png)

---

### Multi-devises · _Récent_

> Devis et factures avec devise et taux de change.

**Explication**

Gère FCFA / autres devises sans figer uniquement l’affichage public.

**Fonctionnement**

À la création du devis/facture → choisir la devise / taux → montants convertis selon la config.

**Lien :** [/admin/crm/devis](https://sdcreativ.com/admin/crm/devis)

**Captures**

![Multi-devises — devis.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/devis.png)

![Multi-devises — factures.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/factures.png)

---

### Factures & CinetPay · _Récent_

> Facturation, PDF, email avec pièce jointe, paiement en ligne.

**Explication**

Workflow devis → facture, identité dynamique sur PDF, paiement CinetPay pour le client.

**Fonctionnement**

Factures (ou depuis un devis signé) → générer → envoyer (PDF joint) → suivre le paiement CinetPay / marquage payé.

**Lien :** [/admin/crm/factures](https://sdcreativ.com/admin/crm/factures)

**Captures**

![Factures & CinetPay — factures.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/factures.png)

![Factures & CinetPay — factures_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/factures_02.png)

---

### Identité emails (chrome) · _Récent_

> Logo et société sur tous les emails CRM.

**Explication**

En-tête / pied d’email homogènes, éditables dans les paramètres.

**Fonctionnement**

Paramètres → identité / templates email → modifier logo & mentions → tester un envoi.

**Lien :** [/admin/crm/parametres](https://sdcreativ.com/admin/crm/parametres)

**Captures**

![Identité emails (chrome) — parametres-email.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/parametres-email.png)

![Identité emails (chrome) — parametres-email_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/parametres-email_02.png)

---

### Archivage à la livraison · _Récent_

> Archive S3 du dossier projet avec manifeste.

**Explication**

Conserve une empreinte du dossier livré pour traçabilité.

**Fonctionnement**

Quand le projet passe en livraison / archive → génération de l’archive + manifeste S3 → consultable dans Archives.

**Lien :** [/admin/crm/archives](https://sdcreativ.com/admin/crm/archives)

**Captures**

![Archivage à la livraison — projets.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/projets.png)

---

### Tâches · _Récent_

> To-do équipe avec assignation et notifications.

**Explication**

Tâches liées lead/client/projet ; l’assigné est notifié à la création / changement.

**Fonctionnement**

Tâches → créer (titre, priorité, échéance, assigné, liens) → suivre jusqu’à Done.

**Lien :** [/admin/crm/taches](https://sdcreativ.com/admin/crm/taches)

**Captures**

![Tâches — taches.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/taches.png)

![Tâches — taches_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/taches_02.png)

---

### Messagerie Hostinger · _Récent_

> Boîtes pro IMAP/SMTP dans le CRM.

**Explication**

Sync, composition, suppressions, liaisons lead/client. Corps HTML rendu (liens/boutons). Activation runtime via `CRM_MESSAGERIE_ENABLED` dans `.env.docker`.

**Fonctionnement**

Messagerie → connecter / choisir la boîte → sync → lire (HTML) → répondre ou composer. Cron mail-sync sur le VPS si activé.

**Lien :** [/admin/crm/messagerie](https://sdcreativ.com/admin/crm/messagerie)

**Captures**

![Messagerie Hostinger — messagerie.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/messagerie.png)

---

### Communications & 3CX · _Récent_

> Téléphonie : appels, screen-pop, stats.

**Explication**

Intégration 3CX : widget, API, pop CRM à l’appel entrant, stats et aides. Création / ouverture de lead depuis un appel.

**Fonctionnement**

Communications pour les stats. À un appel entrant, le screen-pop `/admin/crm/3cx-pop` affiche le contact → créer ou ouvrir le lead.

**Lien :** [/admin/crm/communications](https://sdcreativ.com/admin/crm/communications)

**Captures**

![Communications & 3CX — communications-3cx.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/communications-3cx.png)

---

### Calendrier · _Récent_

> Agenda CRM avec invitations multi-canal.

**Explication**

Événements, participants, rappels (email/SMS selon config).

**Fonctionnement**

Calendrier → créer un événement → ajouter participants → envoyer les invitations.

**Lien :** [/admin/crm/calendrier](https://sdcreativ.com/admin/crm/calendrier)

**Captures**

![Calendrier — calendrier.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/calendrier.png)

![Calendrier — calendrier_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/calendrier_02.png)

![Calendrier — calendrier_03.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/calendrier_03.png)

![Calendrier — calendrier_04.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/calendrier_04.png)

![Calendrier — calendrier_05.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/calendrier_05.png)

![Calendrier — calendrier_06.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/calendrier_06.png)

---

### Contrats employés (RH) · _Récent_

> CDI/CDD, clauses, PDF pro, archivage S3.

**Explication**

Module RH pour générer des contrats professionnels avec clauses juridiques et conservation S3.

**Fonctionnement**

Contrats RH → créer un contrat → renseigner clauses / parties → aperçu PDF → signature native (OTP) ou Yousign → archive auto.

**Lien :** [/admin/crm/rh](https://sdcreativ.com/admin/crm/rh)

**Captures**

![Contrats employés (RH) — contrats-rh.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/contrats-rh.png)

![Contrats employés (RH) — contrats-rh_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/contrats-rh_02.png)

![Contrats employés (RH) — contrats-rh_03.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/contrats-rh_03.png)

---

### CMS site vitrine · _Récent_

> Édition des pages publiques depuis le CRM.

**Explication**

Hero, services, tarifs, équipe, FAQ, formations, carrières, maintenance, audit, légal, solutions IA, configurateur devis, logo S3, etc.

**Fonctionnement**

Site vitrine → choisir la section (subnav) → modifier → enregistrer (revalidation ISR / cache taggé).

**Lien :** [/admin/crm/site](https://sdcreativ.com/admin/crm/site)

**Captures**

![CMS site vitrine — site-cms.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/site-cms.png)

---

### Formations (site) · _Récent_

> Page Formations + fiches par domaine.

**Explication**

Grille visuelle, images domaines S3, pages détail éditables.

**Fonctionnement**

Site → Formations → éditer domaines / images. Public : `/formations` et `/formations/[slug]`.

**Lien :** [/admin/crm/site/formations](https://sdcreativ.com/admin/crm/site/formations)

**Captures**

![Formations (site) — site-cms-formations.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/site-cms-formations.png)

---

### Prise de rendez-vous Cal.com · _Récent_

> Page RDV et liens contact fiabilisés.

**Explication**

Ouverture Cal.com dans le même onglet, URLs nettoyées (plus de about:blank).

**Fonctionnement**

Configurer l’URL Cal.com (env / CMS) → tester `/rendez-vous` et les CTA contact.

**Lien :** [/rendez-vous](https://sdcreativ.com/rendez-vous)

**Captures**

![Prise de rendez-vous Cal.com — rdv-calcom.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/rdv-calcom.png)

---

### Équipe & organigramme · _Récent_

> Membres publics en organigramme hiérarchisé.

**Explication**

Photos S3, crop portrait, affichage À propos depuis la DB.

**Fonctionnement**

Site → Équipe → gérer membres / photos / hiérarchie → vérifier sur le site public.

**Lien :** [/admin/crm/site/equipe](https://sdcreativ.com/admin/crm/site/equipe)

**Captures**

![Équipe & organigramme — site-equipe.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/site-equipe.png)

---

### Espace client · _Récent_

> Portail : projets, factures, tickets, notifications.

**Explication**

Les clients connectés suivent leurs projets, paient / voient les factures, échangent sur les tickets.

**Fonctionnement**

Activer l’accès depuis la fiche Client → le client se connecte sur `/espace-client` → consulte projets / factures / tickets.

**Lien :** [/admin/crm/clients](https://sdcreativ.com/admin/crm/clients)

**Captures**

![Espace client — clients_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/clients_02.png)

---

### Double authentification (2FA) · _Récent_

> TOTP prioritaire, sinon code email / SMS.

**Explication**

Obligatoire à la connexion admin. Email personnel possible pour recevoir le code.

**Fonctionnement**

Connexion → mot de passe → 2FA (app TOTP ou code reçu). Configurer TOTP dans Mon profil.

**Lien :** [/admin/crm/compte](https://sdcreativ.com/admin/crm/compte)

**Captures**

![Double authentification (2FA) — securite-session.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/securite-session.png)

---

### Déconnexion après inactivité · _Récent_

> Session expirée après X minutes sans activité.

**Explication**

Avertissement avant déconnexion ; possibilité de rester connecté (renouvellement cookie).

**Fonctionnement**

Paramètres → Sécurité → régler le délai (0 = off, défaut 30). Après inactivité, dialog → Continuer ou déconnexion.

**Lien :** [/admin/crm/parametres](https://sdcreativ.com/admin/crm/parametres)

**Captures**

![Déconnexion après inactivité — securite-session.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/securite-session.png)

---

### Invitations équipe & email pro · _Récent_

> Onboarding via email personnel + email @sdcreativ.com.

**Explication**

Génère un email pro unique ; accès messagerie Hostinger configurable. Rôles dont Directeur commercial.

**Fonctionnement**

Paramètres → Équipe → inviter (email perso) → l’utilisateur définit son mot de passe → 2FA → accès selon le rôle.

**Lien :** [/admin/crm/parametres](https://sdcreativ.com/admin/crm/parametres)

**Captures**

![Invitations équipe & email pro — securite-session.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/securite-session.png)

---

### Widget santé VPS · _Récent_

> Métriques, Docker, restauration (permission infra.view).

**Explication**

Surveille l’infra depuis le dashboard pour les profils autorisés.

**Fonctionnement**

Dashboard → widget infra → consulter métriques / actions de restauration selon droits.

**Lien :** [/admin/crm](https://sdcreativ.com/admin/crm)

**Captures**

![Widget santé VPS — dashboard-infra.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/dashboard-infra.png)

---

### Flags runtime (.env.docker) · _Récent_

> Source de vérité des variables en production Docker.

**Explication**

Ex. `CRM_MESSAGERIE_ENABLED`, `CRON_SECRET`. Les `NEXT_PUBLIC_*` sont figés au build sauf build-args.

**Fonctionnement**

Éditer `.env.docker` sur le VPS → `docker compose restart app` (ou redeploy) pour les flags runtime.

**Captures**

![Flags runtime (.env.docker) — dashboard-infra.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/dashboard-infra.png)

---

### Navigation mobile · _Récent_

> Barre du bas + menu Plus selon le rôle.

**Explication**

Usage terrain : accès rapide aux modules essentiels sur téléphone.

**Fonctionnement**

Sur mobile, 5 raccourcis selon le rôle ; le reste dans « Plus ».

**Captures**

![Navigation mobile — mobile-nav.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/mobile-nav.png)

![Navigation mobile — mobile-nav_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/mobile-nav_02.png)

![Navigation mobile — mobile-nav_3.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/mobile-nav_3.png)

![Navigation mobile — mobile-nav_04.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/mobile-nav_04.png)

---

