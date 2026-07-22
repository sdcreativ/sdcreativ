/**
 * Catalogue de documentation interne CRM.
 * Captures : déposer des PNG/WebP dans `public/crm-docs/` et les lister dans `screenshots`.
 */

export type CrmDocCategoryId =
  | "overview"
  | "commercial"
  | "marketing"
  | "billing"
  | "ops"
  | "comms"
  | "hr"
  | "content"
  | "portal"
  | "security"
  | "infra";

export type CrmDocFeature = {
  id: string;
  title: string;
  category: CrmDocCategoryId;
  /** Résumé court (1 phrase). */
  summary: string;
  /** Explication / à quoi ça sert. */
  explanation: string;
  /** Comment ça fonctionne (parcours utilisateur). */
  howItWorks: string;
  /** Lien CRM ou page publique associée. */
  href?: string;
  /**
   * Captures sous `/crm-docs/`.
   * Première = aperçu principal ; les suivantes s’affichent en galerie.
   */
  screenshots?: string[];
  /** Badge « récent » pour les livraisons de juillet 2026. */
  recent?: boolean;
};

export type CrmDocCategory = {
  id: CrmDocCategoryId;
  label: string;
  description: string;
};

export const CRM_DOC_CATEGORIES: CrmDocCategory[] = [
  {
    id: "overview",
    label: "Vue d’ensemble",
    description: "Tableau de bord, inbox, charge et rapports.",
  },
  {
    id: "commercial",
    label: "Commercial",
    description: "Leads, opportunités, clients, présentation tablette.",
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Newsletter, waitlist, séquences et campagnes promo.",
  },
  {
    id: "billing",
    label: "Devis & factures",
    description: "Catalogue, devis, signature, factures et paiements.",
  },
  {
    id: "ops",
    label: "Ops & projets",
    description: "Projets, tâches, temps, documents, archives.",
  },
  {
    id: "comms",
    label: "Communications",
    description: "Messagerie, 3CX, calendrier, tickets.",
  },
  {
    id: "hr",
    label: "RH",
    description: "Contrats employés et signatures.",
  },
  {
    id: "content",
    label: "Site & contenu",
    description: "CMS vitrine, blog, formations, rendez-vous.",
  },
  {
    id: "portal",
    label: "Espace client",
    description: "Portail client, accès et tickets.",
  },
  {
    id: "security",
    label: "Sécurité & équipe",
    description: "2FA, session, rôles, profil.",
  },
  {
    id: "infra",
    label: "Infra & ops techniques",
    description: "Santé VPS, flags Docker, déploiements.",
  },
];

export const CRM_DOC_FEATURES: CrmDocFeature[] = [
  // —— Vue d’ensemble ——
  {
    id: "dashboard",
    title: "Tableau de bord",
    category: "overview",
    summary: "Vue synthétique de l’activité selon vos permissions.",
    explanation:
      "Point d’entrée du CRM : KPI, widgets (pipeline, tâches, projets, activité) et, pour les rôles autorisés, widget santé infra.",
    howItWorks:
      "Ouvrez Accueil CRM. Les widgets et KPI affichés dépendent de votre rôle (permissions). Cliquez un KPI ou une ligne d’activité pour aller vers le module concerné.",
    href: "/admin/crm",
    screenshots: ["dashboard.png"],
  },
  {
    id: "inbox",
    title: "Inbox unifiée",
    category: "overview",
    summary: "File de travail groupée (tickets, mails, relances).",
    explanation:
      "Centralise les éléments à traiter. Liste densifiée et regroupée par jour pour traiter plus vite.",
    howItWorks:
      "Inbox → parcourir les groupes du jour → ouvrir un élément. Si un fil messagerie est lié, basculez vers Messagerie depuis l’item.",
    href: "/admin/crm/inbox",
    screenshots: ["inbox.png"],
    recent: true,
  },
  {
    id: "workload",
    title: "Charge",
    category: "overview",
    summary: "Répartition de la charge commerciale / projet.",
    explanation:
      "Aide à voir qui est chargé (relances devis, tâches) pour répartir le travail.",
    howItWorks: "Charge → filtrer / lire la répartition → réassigner depuis Leads, Tâches ou Devis.",
    href: "/admin/crm/charge",
    screenshots: ["charge.png"],
  },
  {
    id: "reports",
    title: "Rapports",
    category: "overview",
    summary: "Indicateurs et exports d’activité.",
    explanation:
      "Tableaux et graphiques (pipeline, conversion, communications…) avec drill-down et exports.",
    howItWorks: "Rapports → choisir la vue → éventuel export PDF/CSV selon le rapport.",
    href: "/admin/crm/rapports",
    screenshots: ["rapports.png", "rapports_02.png", "rapports_03.png"],
  },
  {
    id: "nav-badges",
    title: "Badges compteurs (nav & cloche)",
    category: "overview",
    summary: "Compteurs non lus / à traiter sur la navigation.",
    explanation:
      "Signaux visuels sur Inbox, tâches, notifications, etc., pour prioriser sans ouvrir chaque module.",
    howItWorks:
      "Les badges se mettent à jour automatiquement. La cloche ouvre le panneau de notifications (les lues sont masquées).",
    screenshots: ["inbox.png", "dashboard.png"],
    recent: true,
  },

  // —— Commercial ——
  {
    id: "leads",
    title: "Leads",
    category: "commercial",
    summary: "Pipeline des prospects (kanban + liste).",
    explanation:
      "Suivi des demandes (site, audit, 3CX, manuel…). Score, activités, email, WhatsApp, conversion client.",
    howItWorks:
      "Leads → créer ou ouvrir une fiche → changer le statut / assigné → convertir en client si signé. Détection de doublons + fusion disponibles.",
    href: "/admin/crm/leads",
    screenshots: ["leads.png"],
  },
  {
    id: "lead-marketing-opt-in",
    title: "Opt-in marketing (lead)",
    category: "commercial",
    summary: "Consentement marketing pour les campagnes promo.",
    explanation:
      "En plus (ou à la place) de la newsletter, ce flag autorise l’inclusion du lead dans l’audience des campagnes de relance.",
    howItWorks:
      "Fiche lead → cocher « Opt-in marketing », ou à la création du lead. Les devis tièdes liés deviennent éligibles aux campagnes.",
    href: "/admin/crm/leads",
    screenshots: ["leads.png"],
    recent: true,
  },
  {
    id: "deals",
    title: "Opportunités",
    category: "commercial",
    summary: "Deals / pipeline commercial structuré.",
    explanation: "Suit les opportunités commerciales distinctes des leads bruts.",
    howItWorks: "Opportunités → créer / déplacer les deals selon l’étape → lier client ou lead.",
    href: "/admin/crm/opportunites",
    screenshots: ["opportunites.png"],
  },
  {
    id: "clients",
    title: "Clients",
    category: "commercial",
    summary: "Fiches clients, interactions et accès portail.",
    explanation:
      "Base client : coordonnées, projets, devis, factures, interactions. Gestion des accès espace client depuis la fiche.",
    howItWorks:
      "Clients → ouvrir une fiche → consulter l’historique → gérer l’accès portail si besoin → créer un projet (prérempli).",
    href: "/admin/crm/clients",
    screenshots: ["clients.png", "clients_02.png"],
  },
  {
    id: "project-prefill",
    title: "Création projet préremplie",
    category: "commercial",
    summary: "Nom, assigné et aperçu client préremplis depuis le client.",
    explanation: "Réduit les erreurs et accélère le démarrage d’un projet.",
    howItWorks: "Depuis un client → Nouveau projet → vérifier les champs préremplis → enregistrer.",
    href: "/admin/crm/clients",
    screenshots: ["clients_02.png"],
    recent: true,
  },
  {
    id: "presentation",
    title: "Présentation tablette",
    category: "commercial",
    summary: "Parcours salon / bureau avec brief CRM.",
    explanation:
      "Mode démo terrain : slides + capture du brief prospect renvoyé vers le CRM (lead).",
    howItWorks:
      "Ouvrir Présentation tablette → choisir parcours salon ou bureau → présenter → finaliser le brief (lead créé / enrichi).",
    href: "/presentation",
    screenshots: ["presentation.png", "presentation_02.png"],
    recent: true,
  },
  {
    id: "click-to-call",
    title: "Click-to-call",
    category: "commercial",
    summary: "Appel en un clic depuis un numéro CRM.",
    explanation: "Déclenche l’appel via l’intégration téléphonie (3CX) depuis leads / contacts.",
    howItWorks: "Sur une fiche avec téléphone → bouton d’appel → l’appel part via 3CX.",
    href: "/admin/crm/leads",
    screenshots: ["leads.png", "communications-3cx.png"],
    recent: true,
  },

  // —— Marketing ——
  {
    id: "newsletter",
    title: "Newsletter",
    category: "marketing",
    summary: "Abonnés newsletter du site.",
    explanation: "Liste des emails inscrits (actif / désabonné), source et date.",
    howItWorks: "Marketing → Newsletter → désabonner ou supprimer un contact.",
    href: "/admin/crm/marketing",
    screenshots: ["marketing-newsletter_02.png"],
  },
  {
    id: "waitlist",
    title: "Waitlist",
    category: "marketing",
    summary: "Inscriptions d’intérêt (Phase 2 / produits).",
    explanation: "Collecte les demandes d’intérêt (espace client, CRM, etc.) depuis le site.",
    howItWorks: "Marketing → Waitlist → consulter / supprimer les inscriptions.",
    href: "/admin/crm/marketing",
    screenshots: ["marketing-waitlist.png"],
  },
  {
    id: "sequences",
    title: "Séquences email",
    category: "marketing",
    summary: "Automations email sur les leads (J+0, J+3, J+7…).",
    explanation:
      "Enrôle les leads selon un statut déclencheur et envoie les étapes via cron.",
    howItWorks:
      "Marketing → Séquences → activer/désactiver. Cron `GET /api/cron/marketing-sequences` avec `CRON_SECRET`.",
    href: "/admin/crm/marketing",
    screenshots: ["marketing-sequences.png"],
  },
  {
    id: "promo-campaigns",
    title: "Campagnes de relance promotionnelles",
    category: "marketing",
    summary: "Offre garantie datée sur devis tièdes + opt-in (sans loterie).",
    explanation:
      "Relance commerciale excitante : offre limitée dans le temps, CTA « Je suis intéressé », puis tâche pour le commercial. Opt-in = newsletter active OU flag lead.",
    howItWorks:
      "Marketing → Campagnes → créer (nom, offre, dates) → Activer → Sync audience → Envoyer emails. Le destinataire ouvre `/promo/[token]` → confirme → tâche + notif CRM. Cron optionnel : `/api/cron/promo-campaigns`.",
    href: "/admin/crm/marketing",
    screenshots: ["marketing-campagnes-promo.png"],
    recent: true,
  },

  // —— Billing ——
  {
    id: "catalogue",
    title: "Catalogue prestations",
    category: "billing",
    summary: "Référentiel de lignes pour composer les devis.",
    explanation: "Évite de retaper les prestations ; alimente le configurateur et les devis CRM.",
    howItWorks: "Catalogue → ajouter / éditer des prestations → les sélectionner dans un devis.",
    href: "/admin/crm/catalogue",
    screenshots: ["catalogue.png"],
  },
  {
    id: "quotes",
    title: "Devis",
    category: "billing",
    summary: "Création, envoi, suivi et signature des devis.",
    explanation:
      "Cycle de vie complet : brouillon → envoyé → vu / relance / négociation → signé / facturé. Multi-devises et PDF A4 avec logo.",
    howItWorks:
      "Devis → créer / importer → publier / envoyer → suivre le statut → signature client → générer facture si besoin.",
    href: "/admin/crm/devis",
    screenshots: ["devis.png"],
  },
  {
    id: "quote-pdf",
    title: "PDF devis (logo & Chromium)",
    category: "billing",
    summary: "PDF A4 réel avec identité société embarquée.",
    explanation:
      "Génération via Playwright/Chromium dans Docker ; logo et mentions société cohérents avec les paramètres.",
    howItWorks: "Depuis un devis → aperçu / télécharger PDF. En prod, smokes post-deploy vérifient la chaîne PDF.",
    href: "/admin/crm/devis",
    screenshots: ["devis.png"],
    recent: true,
  },
  {
    id: "quote-signature",
    title: "Signature devis (OTP / audit)",
    category: "billing",
    summary: "Signature électronique SD CREATIV v2.",
    explanation: "Parcours sécurisé (OTP), journal d’audit ; le lead lié passe en Signé.",
    howItWorks: "Client reçoit le lien de signature → OTP → signe. Le CRM met à jour devis + lead.",
    href: "/admin/crm/devis",
    screenshots: ["devis.png"],
    recent: true,
  },
  {
    id: "multi-currency",
    title: "Multi-devises",
    category: "billing",
    summary: "Devis et factures avec devise et taux de change.",
    explanation: "Gère FCFA / autres devises sans figer uniquement l’affichage public.",
    howItWorks: "À la création du devis/facture → choisir la devise / taux → montants convertis selon la config.",
    href: "/admin/crm/devis",
    screenshots: ["devis.png", "factures.png"],
    recent: true,
  },
  {
    id: "invoices",
    title: "Factures & CinetPay",
    category: "billing",
    summary: "Facturation, PDF, email avec pièce jointe, paiement en ligne.",
    explanation:
      "Workflow devis → facture, identité dynamique sur PDF, paiement CinetPay pour le client.",
    howItWorks:
      "Factures (ou depuis un devis signé) → générer → envoyer (PDF joint) → suivre le paiement CinetPay / marquage payé.",
    href: "/admin/crm/factures",
    screenshots: ["factures.png", "factures_02.png"],
    recent: true,
  },
  {
    id: "email-chrome",
    title: "Identité emails (chrome)",
    category: "billing",
    summary: "Logo et société sur tous les emails CRM.",
    explanation: "En-tête / pied d’email homogènes, éditables dans les paramètres.",
    howItWorks: "Paramètres → identité / templates email → modifier logo & mentions → tester un envoi.",
    href: "/admin/crm/parametres",
    screenshots: ["parametres-email.png", "parametres-email_02.png"],
    recent: true,
  },

  // —— Ops ——
  {
    id: "projects",
    title: "Projets",
    category: "ops",
    summary: "Pilotage projets, jalons et livrables.",
    explanation: "Suivi d’avancement, documents, sync avec l’espace client.",
    howItWorks: "Projets → ouvrir un projet → mettre à jour jalons / statut → déposer documents.",
    href: "/admin/crm/projets",
    screenshots: ["projets.png"],
  },
  {
    id: "delivery-archive",
    title: "Archivage à la livraison",
    category: "ops",
    summary: "Archive S3 du dossier projet avec manifeste.",
    explanation: "Conserve une empreinte du dossier livré pour traçabilité.",
    howItWorks: "Quand le projet passe en livraison / archive → génération de l’archive + manifeste S3 → consultable dans Archives.",
    href: "/admin/crm/archives",
    screenshots: ["projets.png"],
    recent: true,
  },
  {
    id: "tasks",
    title: "Tâches",
    category: "ops",
    summary: "To-do équipe avec assignation et notifications.",
    explanation: "Tâches liées lead/client/projet ; l’assigné est notifié à la création / changement.",
    howItWorks: "Tâches → créer (titre, priorité, échéance, assigné, liens) → suivre jusqu’à Done.",
    href: "/admin/crm/taches",
    screenshots: ["taches.png", "taches_02.png"],
    recent: true,
  },
  {
    id: "timesheets",
    title: "Temps",
    category: "ops",
    summary: "Saisie du temps passé sur projets.",
    explanation: "Suivi des heures pour charge et rentabilité.",
    howItWorks: "Temps → saisir une entrée (projet, durée, commentaire) → consulter les totaux.",
    href: "/admin/crm/temps",
    screenshots: ["temps.png", "temps_02.png"],
  },
  {
    id: "vendors",
    title: "Prestataires",
    category: "ops",
    summary: "Gestion des prestataires externes.",
    explanation: "Contacts et accès éventuels espace prestataire.",
    howItWorks: "Prestataires → créer / éditer → partager un lien d’accès si configuré.",
    href: "/admin/crm/prestataires",
    screenshots: ["prestataires.png", "prestataires_02.png"],
  },
  {
    id: "documents",
    title: "Documents",
    category: "ops",
    summary: "Bibliothèque documentaire CRM.",
    explanation: "Stockage et accès contrôlé aux fichiers métier.",
    howItWorks: "Documents → parcourir / uploader → ouvrir selon vos droits.",
    href: "/admin/crm/documents",
    screenshots: ["documents.png"],
  },
  {
    id: "archives",
    title: "Archives",
    category: "ops",
    summary: "Projets / dossiers archivés.",
    explanation: "Consultation des archives de livraison et historiques.",
    howItWorks: "Archives → ouvrir une archive → consulter le manifeste / fichiers.",
    href: "/admin/crm/archives",
    screenshots: ["archives.png"],
  },

  // —— Comms ——
  {
    id: "messagerie",
    title: "Messagerie Hostinger",
    category: "comms",
    summary: "Boîtes pro IMAP/SMTP dans le CRM.",
    explanation:
      "Sync, composition, suppressions, liaisons lead/client. Corps HTML rendu (liens/boutons). Activation runtime via `CRM_MESSAGERIE_ENABLED` dans `.env.docker`.",
    howItWorks:
      "Messagerie → connecter / choisir la boîte → sync → lire (HTML) → répondre ou composer. Cron mail-sync sur le VPS si activé.",
    href: "/admin/crm/messagerie",
    screenshots: ["messagerie.png"],
    recent: true,
  },
  {
    id: "communications-3cx",
    title: "Communications & 3CX",
    category: "comms",
    summary: "Téléphonie : appels, screen-pop, stats.",
    explanation:
      "Intégration 3CX : widget, API, pop CRM à l’appel entrant, stats et aides. Création / ouverture de lead depuis un appel.",
    howItWorks:
      "Communications pour les stats. À un appel entrant, le screen-pop `/admin/crm/3cx-pop` affiche le contact → créer ou ouvrir le lead.",
    href: "/admin/crm/communications",
    screenshots: ["communications-3cx.png"],
    recent: true,
  },
  {
    id: "tickets",
    title: "Tickets support",
    category: "comms",
    summary: "Support client avec fil de messages.",
    explanation: "Tickets CRM + portail ; notification admin quand le client écrit.",
    howItWorks: "Tickets → ouvrir → répondre dans le fil → changer le statut / SLA selon process.",
    href: "/admin/crm/tickets",
    screenshots: ["tickets.png", "tickets_02.png"],
  },
  {
    id: "calendar",
    title: "Calendrier",
    category: "comms",
    summary: "Agenda CRM avec invitations multi-canal.",
    explanation: "Événements, participants, rappels (email/SMS selon config).",
    howItWorks: "Calendrier → créer un événement → ajouter participants → envoyer les invitations.",
    href: "/admin/crm/calendrier",
    screenshots: [
      "calendrier.png",
      "calendrier_02.png",
      "calendrier_03.png",
      "calendrier_04.png",
      "calendrier_05.png",
      "calendrier_06.png",
    ],
    recent: true,
  },

  // —— RH ——
  {
    id: "employee-contracts",
    title: "Contrats employés (RH)",
    category: "hr",
    summary: "CDI/CDD, clauses, PDF pro, archivage S3.",
    explanation:
      "Module RH pour générer des contrats professionnels avec clauses juridiques et conservation S3.",
    howItWorks:
      "Contrats RH → créer un contrat → renseigner clauses / parties → aperçu PDF → signature native (OTP) ou Yousign → archive auto.",
    href: "/admin/crm/rh",
    screenshots: ["contrats-rh.png", "contrats-rh_02.png", "contrats-rh_03.png"],
    recent: true,
  },

  // —— Contenu ——
  {
    id: "blog",
    title: "Blog",
    category: "content",
    summary: "Articles, catégories, commentaires, révisions.",
    explanation: "CMS blog avec autosave, import, modération commentaires.",
    howItWorks: "Blog → nouvel article / éditer → publier. Gérer catégories et commentaires dans les sous-pages.",
    href: "/admin/crm/blog",
    screenshots: ["blog.png", "blog_02.png"],
  },
  {
    id: "site-cms",
    title: "CMS site vitrine",
    category: "content",
    summary: "Édition des pages publiques depuis le CRM.",
    explanation:
      "Hero, services, tarifs, équipe, FAQ, formations, carrières, maintenance, audit, légal, solutions IA, configurateur devis, logo S3, etc.",
    howItWorks:
      "Site vitrine → choisir la section (subnav) → modifier → enregistrer (revalidation ISR / cache taggé).",
    href: "/admin/crm/site",
    screenshots: ["site-cms.png"],
    recent: true,
  },
  {
    id: "formations",
    title: "Formations (site)",
    category: "content",
    summary: "Page Formations + fiches par domaine.",
    explanation: "Grille visuelle, images domaines S3, pages détail éditables.",
    howItWorks: "Site → Formations → éditer domaines / images. Public : `/formations` et `/formations/[slug]`.",
    href: "/admin/crm/site/formations",
    screenshots: ["site-cms-formations.png"],
    recent: true,
  },
  {
    id: "rdv-calcom",
    title: "Prise de rendez-vous Cal.com",
    category: "content",
    summary: "Page RDV et liens contact fiabilisés.",
    explanation: "Ouverture Cal.com dans le même onglet, URLs nettoyées (plus de about:blank).",
    howItWorks: "Configurer l’URL Cal.com (env / CMS) → tester `/rendez-vous` et les CTA contact.",
    href: "/rendez-vous",
    screenshots: ["rdv-calcom.png"],
    recent: true,
  },
  {
    id: "team-orgchart",
    title: "Équipe & organigramme",
    category: "content",
    summary: "Membres publics en organigramme hiérarchisé.",
    explanation: "Photos S3, crop portrait, affichage À propos depuis la DB.",
    howItWorks: "Site → Équipe → gérer membres / photos / hiérarchie → vérifier sur le site public.",
    href: "/admin/crm/site/equipe",
    screenshots: ["site-equipe.png"],
    recent: true,
  },

  // —— Portail ——
  {
    id: "client-portal",
    title: "Espace client",
    category: "portal",
    summary: "Portail : projets, factures, tickets, notifications.",
    explanation:
      "Les clients connectés suivent leurs projets, paient / voient les factures, échangent sur les tickets.",
    howItWorks:
      "Activer l’accès depuis la fiche Client → le client se connecte sur `/espace-client` → consulte projets / factures / tickets.",
    href: "/admin/crm/clients",
    screenshots: ["clients_02.png"],
    recent: true,
  },

  // —— Sécurité ——
  {
    id: "2fa",
    title: "Double authentification (2FA)",
    category: "security",
    summary: "TOTP prioritaire, sinon code email / SMS.",
    explanation: "Obligatoire à la connexion admin. Email personnel possible pour recevoir le code.",
    howItWorks:
      "Connexion → mot de passe → 2FA (app TOTP ou code reçu). Configurer TOTP dans Mon profil.",
    href: "/admin/crm/compte",
    screenshots: ["securite-session.png"],
    recent: true,
  },
  {
    id: "idle-timeout",
    title: "Déconnexion après inactivité",
    category: "security",
    summary: "Session expirée après X minutes sans activité.",
    explanation:
      "Avertissement avant déconnexion ; possibilité de rester connecté (renouvellement cookie).",
    howItWorks:
      "Paramètres → Sécurité → régler le délai (0 = off, défaut 30). Après inactivité, dialog → Continuer ou déconnexion.",
    href: "/admin/crm/parametres",
    screenshots: ["securite-session.png"],
    recent: true,
  },
  {
    id: "team-invite",
    title: "Invitations équipe & email pro",
    category: "security",
    summary: "Onboarding via email personnel + email @sdcreativ.com.",
    explanation:
      "Génère un email pro unique ; accès messagerie Hostinger configurable. Rôles dont Directeur commercial.",
    howItWorks:
      "Paramètres → Équipe → inviter (email perso) → l’utilisateur définit son mot de passe → 2FA → accès selon le rôle.",
    href: "/admin/crm/parametres",
    screenshots: ["securite-session.png"],
    recent: true,
  },
  {
    id: "roles-permissions",
    title: "Rôles & permissions",
    category: "security",
    summary: "Nav, API et dashboard filtrés par permission.",
    explanation: "Chaque module exige une permission de lecture/écriture ; les widgets infra exigent `infra.view`.",
    howItWorks: "Paramètres → rôles / utilisateurs → attribuer un rôle → vérifier la nav visible.",
    href: "/admin/crm/parametres",
    screenshots: ["securite-session.png"],
  },
  {
    id: "profile",
    title: "Mon profil",
    category: "security",
    summary: "Avatar, TOTP, sécurité personnelle.",
    explanation: "Espace personnel hors Paramètres globaux.",
    howItWorks: "Compte / Mon profil → avatar, 2FA TOTP, infos personnelles.",
    href: "/admin/crm/compte",
    screenshots: ["securite-session.png"],
  },

  // —— Infra ——
  {
    id: "infra-widget",
    title: "Widget santé VPS",
    category: "infra",
    summary: "Métriques, Docker, restauration (permission infra.view).",
    explanation: "Surveille l’infra depuis le dashboard pour les profils autorisés.",
    howItWorks: "Dashboard → widget infra → consulter métriques / actions de restauration selon droits.",
    href: "/admin/crm",
    screenshots: ["dashboard-infra.png"],
    recent: true,
  },
  {
    id: "env-docker",
    title: "Flags runtime (.env.docker)",
    category: "infra",
    summary: "Source de vérité des variables en production Docker.",
    explanation:
      "Ex. `CRM_MESSAGERIE_ENABLED`, `CRON_SECRET`. Les `NEXT_PUBLIC_*` sont figés au build sauf build-args.",
    howItWorks:
      "Éditer `.env.docker` sur le VPS → `docker compose restart app` (ou redeploy) pour les flags runtime.",
    screenshots: ["dashboard-infra.png"],
    recent: true,
  },
  {
    id: "mobile-nav",
    title: "Navigation mobile",
    category: "overview",
    summary: "Barre du bas + menu Plus selon le rôle.",
    explanation: "Usage terrain : accès rapide aux modules essentiels sur téléphone.",
    howItWorks: "Sur mobile, 5 raccourcis selon le rôle ; le reste dans « Plus ».",
    screenshots: [
      "mobile-nav.png",
      "mobile-nav_02.png",
      "mobile-nav_3.png",
      "mobile-nav_04.png",
    ],
    recent: true,
  },
];

export function getCrmDocFeaturesByCategory(categoryId: CrmDocCategoryId): CrmDocFeature[] {
  return CRM_DOC_FEATURES.filter((f) => f.category === categoryId);
}

export function searchCrmDocFeatures(query: string): CrmDocFeature[] {
  const q = query.trim().toLowerCase();
  if (!q) return CRM_DOC_FEATURES;
  return CRM_DOC_FEATURES.filter((f) => {
    const hay = `${f.title} ${f.summary} ${f.explanation} ${f.howItWorks}`.toLowerCase();
    return hay.includes(q);
  });
}
