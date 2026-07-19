export type FormationDetailSeed = {
  heroDescription: string;
  metaDescription: string;
  format: string;
  durationSummary: string;
  level: string;
  audience: string[];
  objectives: string[];
  prerequisites: string[];
  outcomes: string[];
  methodology: string[];
  process: { step: number; title: string; description: string }[];
  faq: { question: string; answer: string }[];
};

const defaultProcess: FormationDetailSeed["process"] = [
  {
    step: 1,
    title: "Diagnostic & cadrage",
    description:
      "Analyse de votre contexte, du niveau des participants et des objectifs métier pour calibrer le parcours.",
  },
  {
    step: 2,
    title: "Programme sur mesure",
    description:
      "Sélection des modules, cas pratiques et supports adaptés à votre secteur et à vos outils.",
  },
  {
    step: 3,
    title: "Animation pratique",
    description:
      "Sessions interactives, ateliers et mises en situation pour ancrer les compétences rapidement.",
  },
  {
    step: 4,
    title: "Évaluation & suivi",
    description:
      "Bilan, attestation et recommandations pour prolonger la montée en compétences en entreprise.",
  },
];

const defaultMethodology = [
  "Apports théoriques ciblés et actionnables",
  "Ateliers pratiques et études de cas",
  "Supports numériques fournis aux participants",
  "Échanges avec un formateur expert du terrain",
];

function detail(
  overrides: Pick<
    FormationDetailSeed,
    | "heroDescription"
    | "metaDescription"
    | "format"
    | "durationSummary"
    | "level"
    | "audience"
    | "objectives"
    | "prerequisites"
    | "outcomes"
  > &
    Partial<Pick<FormationDetailSeed, "methodology" | "process" | "faq">>,
): FormationDetailSeed {
  return {
    methodology: overrides.methodology ?? defaultMethodology,
    process: overrides.process ?? defaultProcess,
    faq: overrides.faq ?? [],
    heroDescription: overrides.heroDescription,
    metaDescription: overrides.metaDescription,
    format: overrides.format,
    durationSummary: overrides.durationSummary,
    level: overrides.level,
    audience: overrides.audience,
    objectives: overrides.objectives,
    prerequisites: overrides.prerequisites,
    outcomes: overrides.outcomes,
  };
}

/** Contenu riche des pages /formations/[slug], indexé par id de domaine. */
export const formationDetailsById: Record<string, FormationDetailSeed> = {
  "developpement-web-mobile": detail({
    heroDescription:
      "Devenez développeur full stack ou renforcez votre stack moderne : web, mobile, API et WordPress professionnel.",
    metaDescription:
      "Formation développement web & mobile à Abidjan : Full Stack, PHP/Symfony, React, Next.js, Node.js, PWA et WordPress. Devis sur mesure.",
    format: "Présentiel, distanciel ou intra-entreprise",
    durationSummary: "2 à 10 jours selon le module",
    level: "Débutant à avancé",
    audience: [
      "Futurs développeurs en reconversion",
      "Développeurs juniors / intermédiaires",
      "Équipes produit et tech de PME",
      "Freelances souhaitant élargir leur stack",
    ],
    objectives: [
      "Maîtriser les fondamentaux du développement web moderne",
      "Construire des applications Full Stack opérationnelles",
      "Exposer et consommer des API REST / GraphQL",
      "Livrer des expériences mobile et PWA performantes",
    ],
    prerequisites: [
      "Bases en informatique et logique algorithmique",
      "Ordinateur portable pour les ateliers",
      "Notions HTML/CSS recommandées (selon module)",
    ],
    outcomes: [
      "Projets pratiques à valoriser dans un portfolio",
      "Méthodes de travail professionnelles (Git, revues)",
      "Attestation de participation SD CREATIV",
    ],
    faq: [
      {
        question: "Faut-il déjà savoir coder ?",
        answer:
          "Selon le module : certains parcours démarrent dès les bases, d’autres ciblent des profils déjà initiés. Nous adaptons le niveau après cadrage.",
      },
      {
        question: "Les formations couvrent-elles le mobile natif ?",
        answer:
          "Nous traitons le développement mobile moderne (approches hybrides / PWA) et les bonnes pratiques de livraison. Précisez votre cible (iOS, Android, web) pour un programme adapté.",
      },
    ],
  }),

  "intelligence-artificielle": detail({
    heroDescription:
      "Adoptez l’IA en entreprise : initiation, ChatGPT, prompt engineering, automatisation et assistants sur mesure.",
    metaDescription:
      "Formation IA pour entreprises en Côte d'Ivoire : ChatGPT, prompt engineering, automatisation et assistants IA. Présentiel ou distanciel.",
    format: "Présentiel, distanciel ou atelier intra",
    durationSummary: "1 à 3 jours selon le module",
    level: "Tous niveaux",
    audience: [
      "Dirigeants et managers de PME",
      "Équipes marketing, RH et support",
      "Développeurs souhaitant intégrer l’IA",
      "Consultants et freelances",
    ],
    objectives: [
      "Comprendre les usages concrets de l’IA générative",
      "Rédiger des prompts efficaces et sûrs",
      "Automatiser des tâches métier avec l’IA",
      "Cadre éthique, confidentialité et bonnes pratiques",
    ],
    prerequisites: [
      "Usage courant d’un ordinateur et d’Internet",
      "Aucun prérequis technique pour les modules métier",
    ],
    outcomes: [
      "Cas d’usage prioritaires identifiés pour votre organisation",
      "Bibliothèque de prompts adaptés à vos métiers",
      "Plan d’adoption IA réaliste",
    ],
    faq: [
      {
        question: "Les données d’entreprise sont-elles protégées ?",
        answer:
          "Oui. Nous enseignons les bonnes pratiques (anonymisation, politiques d’usage, choix d’outils) pour limiter les risques de fuite d’information.",
      },
    ],
  }),

  "cybersecurite-devsecops": detail({
    heroDescription:
      "Sécurisez vos applications et vos équipes : sensibilisation, OWASP, DevSecOps, tests et gestion d’incidents.",
    metaDescription:
      "Formation cybersécurité & DevSecOps : OWASP Top 10, sécurité web, Docker/Kubernetes sécurisés, pentesting débutant. Abidjan et distanciel.",
    format: "Présentiel ou distanciel sécurisé",
    durationSummary: "1 à 3 jours selon le module",
    level: "Débutant à intermédiaire",
    audience: [
      "Développeurs et équipes DevOps",
      "RSSI et responsables IT",
      "Chefs de projet digitaux",
      "Collaborateurs à sensibiliser",
    ],
    objectives: [
      "Identifier les risques web les plus courants",
      "Intégrer la sécurité dans le cycle de développement",
      "Mettre en place des contrôles DevSecOps",
      "Réagir efficacement en cas d’incident",
    ],
    prerequisites: [
      "Notions de développement ou d’administration système selon le module",
      "Sensibilisation ouverte à tous les profils",
    ],
    outcomes: [
      "Checklists de sécurité applicables immédiatement",
      "Référentiel OWASP adapté à vos apps",
      "Plan de remédiation priorisé",
    ],
    faq: [
      {
        question: "Proposez-vous du pentesting avancé ?",
        answer:
          "Le module pentesting est orienté débutant / découverte. Pour un audit offensif approfondi, nous proposons un accompagnement conseil dédié.",
      },
    ],
  }),

  "cloud-devops": detail({
    heroDescription:
      "Maîtrisez Docker, Kubernetes, CI/CD, Linux, Nginx et l’infrastructure as code pour des déploiements fiables.",
    metaDescription:
      "Formation Cloud, DevOps & infrastructure : Docker, Kubernetes, GitLab CI/CD, GitHub Actions, Terraform, Ansible. Côte d'Ivoire.",
    format: "Présentiel lab ou distanciel avec environnement cloud",
    durationSummary: "1 à 3 jours selon le module",
    level: "Intermédiaire",
    audience: [
      "Administrateurs systèmes",
      "Développeurs Full Stack",
      "Ingénieurs DevOps en montée en compétences",
      "Équipes hébergement / SRE",
    ],
    objectives: [
      "Conteneuriser et orchestrer des applications",
      "Automatiser les pipelines CI/CD",
      "Administrer Linux et Nginx en production",
      "Industrialiser l’infra avec Terraform / Ansible",
    ],
    prerequisites: [
      "Bases Linux en ligne de commande",
      "Notions de réseaux et de Git",
    ],
    outcomes: [
      "Environnements de lab reproductibles",
      "Pipelines CI/CD fonctionnels",
      "Bonnes pratiques d’exploitation",
    ],
    faq: [],
  }),

  "bases-de-donnees": detail({
    heroDescription:
      "Concevoir, interroger et optimiser vos données : SQL, MySQL, PostgreSQL, MongoDB, Merise et UML.",
    metaDescription:
      "Formation bases de données : SQL, MySQL, PostgreSQL, MariaDB, MongoDB, optimisation, Merise et UML. Abidjan et distanciel.",
    format: "Présentiel ou distanciel avec exercices SQL",
    durationSummary: "2 jours par module en moyenne",
    level: "Débutant à intermédiaire",
    audience: [
      "Développeurs et analystes",
      "Data / BI juniors",
      "Chefs de projet SI",
      "Étudiants en informatique",
    ],
    objectives: [
      "Modéliser une base cohérente (Merise / UML)",
      "Écrire des requêtes SQL efficaces",
      "Choisir entre SQL et NoSQL selon le besoin",
      "Optimiser performances et index",
    ],
    prerequisites: ["Logique de base et usage tableur recommandés"],
    outcomes: [
      "Schémas de données propres",
      "Requêtes et vues réutilisables",
      "Méthode d’optimisation concrète",
    ],
    faq: [],
  }),

  "developpement-rust": detail({
    heroDescription:
      "Spécialisez-vous en Rust : initiation, backend Actix, WebAssembly, CLI, bibliothèques et sécurité mémoire.",
    metaDescription:
      "Formation Rust avancée : Actix Web, WebAssembly, CLI, bibliothèques et sécurité. Différenciez vos compétences tech.",
    format: "Présentiel intensif ou distanciel mentoré",
    durationSummary: "2 à 4 jours selon le module",
    level: "Intermédiaire à avancé",
    audience: [
      "Développeurs expérimentés (C, C++, Go, JS…)",
      "Ingénieurs systèmes et backend",
      "Équipes sécurité applicative",
    ],
    objectives: [
      "Comprendre ownership, borrowing et lifetimes",
      "Construire des services backend performants",
      "Compiler vers WebAssembly",
      "Publier des CLI et bibliothèques propres",
    ],
    prerequisites: [
      "Expérience solide dans au moins un langage",
      "À l’aise avec le terminal et Git",
    ],
    outcomes: [
      "Projets Rust démontrables",
      "Réflexes sécurité mémoire",
      "Stack différenciante sur le marché",
    ],
    faq: [
      {
        question: "Rust est-il pertinent pour une PME ?",
        answer:
          "Oui pour des composants critiques (perf, sécurité, CLI, edge). Nous aidons à identifier où Rust apporte un ROI réel.",
      },
    ],
  }),

  bureautique: detail({
    heroDescription:
      "Word, Excel, PowerPoint, Outlook, Google Workspace et LibreOffice — des formations très demandées par les entreprises.",
    metaDescription:
      "Formation bureautique professionnelle : Word, Excel, PowerPoint, Outlook, Google Workspace, LibreOffice. Intra-entreprise possible.",
    format: "Présentiel en salle ou en entreprise",
    durationSummary: "1 à 2 jours selon le module",
    level: "Débutant à intermédiaire",
    audience: [
      "Assistants et secrétaires",
      "Équipes administratives",
      "Commerciaux et managers",
      "Collectivités et administrations",
    ],
    objectives: [
      "Gagner en productivité au quotidien",
      "Produire des documents professionnels",
      "Automatiser Excel (formules, tableaux croisés)",
      "Collaborer efficacement sur le cloud",
    ],
    prerequisites: ["Savoir utiliser un ordinateur"],
    outcomes: [
      "Modèles de documents réutilisables",
      "Tableaux de suivi opérationnels",
      "Bonnes pratiques de classement",
    ],
    faq: [],
  }),

  "marketing-digital": detail({
    heroDescription:
      "Community management, Ads, SEO, email marketing, Canva et branding pour développer votre visibilité.",
    metaDescription:
      "Formation marketing digital & communication : SEO, Facebook Ads, Google Ads, community management, emailing et branding.",
    format: "Présentiel ou distanciel avec cas pratiques",
    durationSummary: "1 à 2 jours selon le module",
    level: "Tous niveaux",
    audience: [
      "Responsables marketing et communication",
      "Community managers",
      "Entrepreneurs et dirigeants de PME",
      "Agences et freelances",
    ],
    objectives: [
      "Construire une présence digitale cohérente",
      "Lancer et optimiser des campagnes Ads",
      "Améliorer le référencement naturel",
      "Produire du contenu engageant",
    ],
    prerequisites: ["Compte publicité / réseaux selon le module"],
    outcomes: [
      "Plan éditorial actionnable",
      "Campagnes structurées et mesurables",
      "Kit de bonnes pratiques SEO / Ads",
    ],
    faq: [],
  }),

  "creation-graphique": detail({
    heroDescription:
      "Photoshop, Illustrator, InDesign, Figma, Canva, montage vidéo et motion design pour des supports pro.",
    metaDescription:
      "Formation création graphique & multimédia : Photoshop, Illustrator, Figma, Canva, montage vidéo et motion design.",
    format: "Ateliers pratiques en salle ou distanciel",
    durationSummary: "1 à 3 jours selon le module",
    level: "Débutant à intermédiaire",
    audience: [
      "Graphistes juniors",
      "Marketeurs et community managers",
      "Chargés de communication",
      "Entrepreneurs créant leurs supports",
    ],
    objectives: [
      "Maîtriser les outils clés du design",
      "Respecter une identité visuelle",
      "Produire print et digital de qualité",
      "Initier le motion et le montage vidéo",
    ],
    prerequisites: ["Ordinateur adapté aux logiciels ciblés"],
    outcomes: [
      "Supports livrables prêts à l’emploi",
      "Méthode de travail design",
      "Portfolio enrichi",
    ],
    faq: [],
  }),

  "gestion-de-projet": detail({
    heroDescription:
      "Agile Scrum, Kanban, Jira, Trello et MS Project pour piloter vos projets informatiques avec méthode.",
    metaDescription:
      "Formation gestion de projet : Agile Scrum, Kanban, Jira, Trello, MS Project et gestion de projet informatique.",
    format: "Présentiel ou distanciel collaboratif",
    durationSummary: "1 à 3 jours selon le module",
    level: "Tous niveaux",
    audience: [
      "Chefs de projet et product owners",
      "Managers d’équipes tech",
      "Scrum masters en devenir",
      "Consultants et PMO",
    ],
    objectives: [
      "Appliquer Scrum et Kanban au quotidien",
      "Piloter le backlog et les sprints",
      "Utiliser Jira / Trello efficacement",
      "Suivre délais, risques et charges",
    ],
    prerequisites: ["Expérience projet souhaitable mais non obligatoire"],
    outcomes: [
      "Cadence agile opérationnelle",
      "Tableaux de bord de suivi",
      "Rituels d’équipe clarifiés",
    ],
    faq: [],
  }),

  entrepreneuriat: detail({
    heroDescription:
      "Création d’entreprise, Business Model Canvas, digitalisation et innovation — idéal pour les PME.",
    metaDescription:
      "Formation entrepreneuriat & transformation digitale : création d’entreprise, BMC, digitalisation et innovation pour PME.",
    format: "Ateliers coaching + formation",
    durationSummary: "1 à 2 jours selon le module",
    level: "Tous niveaux",
    audience: [
      "Porteurs de projet",
      "Dirigeants de PME",
      "Intrapreneurs",
      "Structures d’accompagnement",
    ],
    objectives: [
      "Clarifier le modèle économique",
      "Prioriser la digitalisation",
      "Structurer un plan d’action réaliste",
      "Innover avec des méthodes simples",
    ],
    prerequisites: ["Aucun"],
    outcomes: [
      "Business Model Canvas renseigné",
      "Roadmap digitale priorisée",
      "Indicateurs de suivi",
    ],
    faq: [],
  }),

  "management-soft-skills": detail({
    heroDescription:
      "Leadership, communication, gestion du temps, conflits et prise de parole — pour des équipes performantes.",
    metaDescription:
      "Formation management & soft skills : leadership, communication professionnelle, gestion des conflits et prise de parole.",
    format: "Présentiel interactif ou distanciel",
    durationSummary: "1 à 2 jours selon le module",
    level: "Tous niveaux",
    audience: [
      "Managers et team leads",
      "Collaborateurs en évolution",
      "Commerciaux et consultants",
      "Équipes en transformation",
    ],
    objectives: [
      "Renforcer le leadership situationnel",
      "Communiquer avec clarté et impact",
      "Gérer conflits et priorités",
      "Prendre la parole en public avec aisance",
    ],
    prerequisites: ["Aucun"],
    outcomes: [
      "Outils de management immédiatement utilisables",
      "Plan de développement personnel",
      "Mises en situation filmées (selon module)",
    ],
    faq: [],
  }),

  "administrations-publiques": detail({
    heroDescription:
      "Transformation numérique, e-administration, GED, cybersécurité des collectivités et RGPD.",
    metaDescription:
      "Formation administrations publiques : e-administration, dématérialisation, GED, cybersécurité des collectivités et RGPD.",
    format: "Intra-collectivité ou sessions dédiées",
    durationSummary: "1 à 2 jours selon le module",
    level: "Tous niveaux",
    audience: [
      "Agents et cadres de mairies",
      "Ministères et établissements publics",
      "DSI / RSI du secteur public",
      "Responsables archivage et GED",
    ],
    objectives: [
      "Accélérer la dématérialisation des procédures",
      "Sécuriser les systèmes des collectivités",
      "Mettre en place une GED efficace",
      "Respecter les exigences de protection des données",
    ],
    prerequisites: ["Selon le module : profil métier ou profil IT"],
    outcomes: [
      "Feuille de route numérique",
      "Procédures simplifiées",
      "Sensibilisation cybersécurité / RGPD",
    ],
    faq: [
      {
        question: "Intervenez-vous hors d’Abidjan ?",
        answer:
          "Oui, en présentiel sur site ou en distanciel selon vos contraintes. Demandez un devis pour votre collectivité.",
      },
    ],
  }),

  "accompagnement-conseil": detail({
    heroDescription:
      "Au-delà de la formation : audits, coaching technique, mentorat et assistance à la transformation numérique.",
    metaDescription:
      "Accompagnement & conseil SD CREATIV : audit informatique, cybersécurité, coaching technique, mentorat et transformation digitale.",
    format: "Mission sur mesure (présentiel / remote)",
    durationSummary: "Selon le périmètre de mission",
    level: "Sur mesure",
    audience: [
      "PME et startups",
      "Directions générales et DSI",
      "Équipes tech en structuration",
      "Collectivités et ONG",
    ],
    objectives: [
      "Évaluer l’existant (IT / cybersécurité)",
      "Définir une trajectoire digitale réaliste",
      "Accélérer les compétences via mentorat",
      "Sécuriser les décisions techniques",
    ],
    prerequisites: ["Brief initial et accès aux informations nécessaires"],
    outcomes: [
      "Rapport d’audit actionnable",
      "Plan d’accompagnement chiffré",
      "Transfert de compétences mesurable",
    ],
    methodology: [
      "Audit et entretiens terrain",
      "Recommandations priorisées (quick wins)",
      "Coaching / pair programming selon besoin",
      "Suivi d’indicateurs et comités de pilotage",
    ],
    faq: [
      {
        question: "Peut-on combiner formation et conseil ?",
        answer:
          "Oui. C’est souvent le format le plus efficace : audit, puis formation ciblée, puis accompagnement à la mise en œuvre.",
      },
    ],
  }),
};

export function getFormationDetailSeed(id: string): FormationDetailSeed | undefined {
  return formationDetailsById[id];
}
