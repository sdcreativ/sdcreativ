import type { LucideIconName } from "@/lib/lucide-icon-map";

export type FormationCourseSeed = {
  title: string;
  /** Ex. "2 jours", "14 h" */
  duration?: string;
  /** Prix indicatif en FCFA (optionnel). */
  price?: number | null;
};

export type FormationCategorySeed = {
  id: string;
  icon: LucideIconName;
  title: string;
  description: string;
  /** Photo illustrative (chemin public). */
  image: string;
  imageAlt?: string;
  courses: FormationCourseSeed[];
  /** Si true, la liste est présentée comme des services (accompagnement). */
  isServices?: boolean;
};

export type FormationHighlightSeed = {
  icon: LucideIconName;
  title: string;
  description: string;
};

export type FormationFaqSeed = {
  question: string;
  answer: string;
};

export const formationsHighlights: FormationHighlightSeed[] = [
  {
    icon: "GraduationCap",
    title: "Formateurs experts",
    description:
      "Intervenants issus du terrain : développement, IA, cybersécurité, cloud et digital.",
  },
  {
    icon: "Target",
    title: "Sur mesure",
    description:
      "Programmes adaptés à vos objectifs, votre niveau et votre secteur d'activité.",
  },
  {
    icon: "Clock",
    title: "Présentiel ou distanciel",
    description:
      "Sessions en entreprise, en salle ou en ligne — selon vos contraintes.",
  },
  {
    icon: "Award",
    title: "Pratique & opérationnel",
    description:
      "Ateliers, cas concrets et mises en situation pour une montée en compétences réelle.",
  },
];

function courses(...titles: string[]): FormationCourseSeed[] {
  return titles.map((title) => ({ title }));
}

export const formationCategories: FormationCategorySeed[] = [
  {
    id: "developpement-web-mobile",
    icon: "Code2",
    title: "Développement Web & Mobile",
    description:
      "Destinée aux personnes souhaitant devenir développeur ou renforcer leurs compétences.",
    image: "/images/formations/developpement-web-mobile.jpg",
    imageAlt: "Développeur travaillant sur du code web",
    courses: [
      { title: "Développement Web Full Stack", duration: "10 jours", price: 450_000 },
      { title: "PHP & Symfony", duration: "5 jours", price: 250_000 },
      { title: "JavaScript / TypeScript", duration: "4 jours", price: 200_000 },
      { title: "React.js", duration: "5 jours", price: 250_000 },
      { title: "Next.js", duration: "4 jours", price: 220_000 },
      { title: "Node.js", duration: "4 jours", price: 200_000 },
      { title: "API REST & GraphQL", duration: "3 jours", price: 180_000 },
      { title: "Développement Mobile", duration: "5 jours", price: 250_000 },
      { title: "Progressive Web Apps (PWA)", duration: "2 jours", price: 120_000 },
      { title: "WordPress Professionnel", duration: "3 jours", price: 150_000 },
    ],
  },
  {
    id: "intelligence-artificielle",
    icon: "Brain",
    title: "Intelligence Artificielle (IA)",
    description: "Accompagner les entreprises dans l'utilisation de l'IA.",
    image: "/images/formations/intelligence-artificielle.jpg",
    imageAlt: "Illustration d'intelligence artificielle et de réseaux neuronaux",
    courses: [
      { title: "Initiation à l'Intelligence Artificielle", duration: "1 jour", price: 80_000 },
      { title: "ChatGPT en entreprise", duration: "1 jour", price: 80_000 },
      { title: "Prompt Engineering", duration: "2 jours", price: 120_000 },
      { title: "Automatisation avec l'IA", duration: "2 jours", price: 150_000 },
      { title: "IA pour les développeurs", duration: "3 jours", price: 180_000 },
      { title: "IA générative pour les métiers", duration: "2 jours", price: 120_000 },
      { title: "Création d'assistants IA", duration: "3 jours", price: 200_000 },
    ],
  },
  {
    id: "cybersecurite-devsecops",
    icon: "Shield",
    title: "Cybersécurité & DevSecOps",
    description: "Former les équipes à sécuriser leurs applications.",
    image: "/images/formations/cybersecurite-devsecops.jpg",
    imageAlt: "Espace de travail cybersécurité avec écrans de monitoring",
    courses: [
      { title: "Sensibilisation à la cybersécurité", duration: "1 jour", price: 60_000 },
      { title: "Sécurité des applications Web", duration: "3 jours", price: 200_000 },
      { title: "DevSecOps", duration: "3 jours", price: 220_000 },
      { title: "Docker & Kubernetes sécurisés", duration: "3 jours", price: 220_000 },
      { title: "Tests de sécurité", duration: "2 jours", price: 150_000 },
      { title: "OWASP Top 10", duration: "2 jours", price: 150_000 },
      { title: "Pentesting (niveau débutant)", duration: "3 jours", price: 250_000 },
      { title: "Gestion des incidents", duration: "2 jours", price: 150_000 },
    ],
  },
  {
    id: "cloud-devops",
    icon: "Cloud",
    title: "Cloud, DevOps & Infrastructure",
    description: "Pour les administrateurs systèmes et développeurs.",
    image: "/images/formations/cloud-devops.jpg",
    imageAlt: "Infrastructure cloud et réseaux globaux",
    courses: [
      { title: "Docker", duration: "2 jours", price: 120_000 },
      { title: "Kubernetes", duration: "3 jours", price: 200_000 },
      { title: "Git & GitHub", duration: "1 jour", price: 60_000 },
      { title: "GitLab CI/CD", duration: "2 jours", price: 150_000 },
      { title: "GitHub Actions", duration: "2 jours", price: 150_000 },
      { title: "Linux Administration", duration: "3 jours", price: 180_000 },
      { title: "Nginx", duration: "1 jour", price: 80_000 },
      { title: "Hébergement VPS", duration: "2 jours", price: 120_000 },
      { title: "Terraform", duration: "2 jours", price: 180_000 },
      { title: "Ansible", duration: "2 jours", price: 180_000 },
    ],
  },
  {
    id: "bases-de-donnees",
    icon: "Database",
    title: "Bases de données",
    description:
      "Maîtriser la conception, l'interrogation et l'optimisation des données.",
    image: "/images/formations/bases-de-donnees.jpg",
    imageAlt: "Salle de serveurs pour bases de données",
    courses: [
      { title: "SQL", duration: "2 jours", price: 100_000 },
      { title: "MySQL", duration: "2 jours", price: 120_000 },
      { title: "PostgreSQL", duration: "2 jours", price: 120_000 },
      { title: "MariaDB", duration: "2 jours", price: 120_000 },
      { title: "MongoDB", duration: "2 jours", price: 120_000 },
      { title: "Optimisation des bases de données", duration: "2 jours", price: 150_000 },
      { title: "Conception Merise", duration: "2 jours", price: 100_000 },
      { title: "UML", duration: "2 jours", price: 100_000 },
    ],
  },
  {
    id: "developpement-rust",
    icon: "Cpu",
    title: "Développement Rust",
    description: "Une spécialité qui peut vous différencier de la concurrence.",
    image: "/images/formations/developpement-rust.jpg",
    imageAlt: "Écran de code pour le développement système",
    courses: [
      { title: "Initiation à Rust", duration: "3 jours", price: 200_000 },
      { title: "Rust Avancé", duration: "4 jours", price: 280_000 },
      { title: "Développement Backend avec Actix Web", duration: "3 jours", price: 250_000 },
      { title: "Rust & WebAssembly", duration: "2 jours", price: 180_000 },
      { title: "Sécurité en Rust", duration: "2 jours", price: 180_000 },
      { title: "Développement de CLI", duration: "2 jours", price: 150_000 },
      { title: "Développement de bibliothèques Rust", duration: "3 jours", price: 220_000 },
    ],
  },
  {
    id: "bureautique",
    icon: "FileSpreadsheet",
    title: "Bureautique",
    description: "Très demandée par les entreprises.",
    image: "/images/formations/bureautique.jpg",
    imageAlt: "Poste de travail bureautique avec ordinateur portable",
    courses: [
      { title: "Microsoft Word", duration: "1 jour", price: 40_000 },
      { title: "Excel", duration: "2 jours", price: 60_000 },
      { title: "PowerPoint", duration: "1 jour", price: 40_000 },
      { title: "Outlook", duration: "1 jour", price: 40_000 },
      { title: "Google Workspace", duration: "1 jour", price: 40_000 },
      { title: "LibreOffice", duration: "1 jour", price: 40_000 },
    ],
  },
  {
    id: "marketing-digital",
    icon: "Megaphone",
    title: "Marketing Digital & Communication",
    description:
      "Développer votre visibilité et vos performances sur les canaux digitaux.",
    image: "/images/formations/marketing-digital.jpg",
    imageAlt: "Tableau de bord analytics et marketing digital",
    courses: [
      { title: "Community Management", duration: "2 jours", price: 100_000 },
      { title: "Création de contenu", duration: "2 jours", price: 100_000 },
      { title: "Facebook Ads", duration: "2 jours", price: 120_000 },
      { title: "Google Ads", duration: "2 jours", price: 120_000 },
      { title: "SEO", duration: "2 jours", price: 120_000 },
      { title: "Email Marketing", duration: "1 jour", price: 60_000 },
      { title: "Canva Professionnel", duration: "1 jour", price: 50_000 },
      { title: "Branding", duration: "2 jours", price: 100_000 },
    ],
  },
  {
    id: "creation-graphique",
    icon: "Palette",
    title: "Création Graphique & Multimédia",
    description: "Outils et méthodes pour produire des supports professionnels.",
    image: "/images/formations/creation-graphique.jpg",
    imageAlt: "Espace de création graphique et design",
    courses: [
      { title: "Photoshop", duration: "3 jours", price: 150_000 },
      { title: "Illustrator", duration: "3 jours", price: 150_000 },
      { title: "InDesign", duration: "2 jours", price: 120_000 },
      { title: "Figma", duration: "2 jours", price: 120_000 },
      { title: "Canva", duration: "1 jour", price: 50_000 },
      { title: "Montage vidéo", duration: "3 jours", price: 150_000 },
      { title: "Motion Design", duration: "3 jours", price: 180_000 },
    ],
  },
  {
    id: "gestion-de-projet",
    icon: "FolderKanban",
    title: "Gestion de Projet",
    description: "Méthodes agiles et outils pour piloter vos projets efficacement.",
    image: "/images/formations/gestion-de-projet.jpg",
    imageAlt: "Planification et gestion de projet sur un bureau",
    courses: [
      { title: "Agile Scrum", duration: "2 jours", price: 120_000 },
      { title: "Kanban", duration: "1 jour", price: 60_000 },
      { title: "Gestion de projet informatique", duration: "3 jours", price: 150_000 },
      { title: "Jira", duration: "1 jour", price: 60_000 },
      { title: "Trello", duration: "1 jour", price: 40_000 },
      { title: "MS Project", duration: "2 jours", price: 100_000 },
    ],
  },
  {
    id: "entrepreneuriat",
    icon: "Rocket",
    title: "Entrepreneuriat & Transformation Digitale",
    description: "Idéal pour les PME.",
    image: "/images/formations/entrepreneuriat.jpg",
    imageAlt: "Équipe entrepreneuriale en réunion de travail",
    courses: [
      { title: "Création d'entreprise", duration: "2 jours", price: 100_000 },
      { title: "Business Model Canvas", duration: "1 jour", price: 60_000 },
      { title: "Digitalisation des entreprises", duration: "2 jours", price: 120_000 },
      { title: "Gestion de projet numérique", duration: "2 jours", price: 100_000 },
      { title: "Transformation digitale", duration: "2 jours", price: 120_000 },
      { title: "Innovation", duration: "1 jour", price: 60_000 },
    ],
  },
  {
    id: "management-soft-skills",
    icon: "Users",
    title: "Management & Soft Skills",
    description:
      "Renforcer le leadership, la communication et la performance des équipes.",
    image: "/images/formations/management-soft-skills.jpg",
    imageAlt: "Équipe collaborant autour d'une table",
    courses: [
      { title: "Leadership", duration: "2 jours", price: 100_000 },
      { title: "Communication professionnelle", duration: "1 jour", price: 60_000 },
      { title: "Gestion du temps", duration: "1 jour", price: 50_000 },
      { title: "Travail en équipe", duration: "1 jour", price: 50_000 },
      { title: "Gestion des conflits", duration: "1 jour", price: 60_000 },
      { title: "Prise de parole en public", duration: "1 jour", price: 60_000 },
      { title: "Développement personnel", duration: "1 jour", price: 50_000 },
    ],
  },
  {
    id: "administrations-publiques",
    icon: "Building2",
    title: "Formation des Administrations Publiques",
    description:
      "Programmes dédiés aux mairies, ministères et établissements publics.",
    image: "/images/formations/administrations-publiques.jpg",
    imageAlt: "Immeuble moderne symbolisant les administrations publiques",
    courses: [
      { title: "Transformation numérique", duration: "2 jours", price: 150_000 },
      { title: "E-administration", duration: "2 jours", price: 150_000 },
      { title: "Dématérialisation des procédures", duration: "2 jours", price: 150_000 },
      { title: "Cybersécurité des collectivités", duration: "2 jours", price: 180_000 },
      { title: "Gestion électronique des documents (GED)", duration: "2 jours", price: 150_000 },
      { title: "Protection des données (RGPD)", duration: "1 jour", price: 80_000 },
    ],
  },
  {
    id: "accompagnement-conseil",
    icon: "Handshake",
    title: "Accompagnement & Conseil",
    description: "En complément des formations.",
    image: "/images/formations/accompagnement-conseil.jpg",
    imageAlt: "Séance de conseil et accompagnement professionnel",
    isServices: true,
    courses: courses(
      "Audit informatique",
      "Audit cybersécurité",
      "Accompagnement digital",
      "Coaching technique",
      "Mentorat",
      "Assistance à la transformation numérique",
    ),
  },
];

export const formationsFaq: FormationFaqSeed[] = [
  {
    question: "Pour qui sont destinées vos formations ?",
    answer:
      "Particuliers en reconversion, équipes techniques, managers, PME et administrations publiques. Chaque programme peut être adapté au niveau et aux objectifs du public.",
  },
  {
    question: "Proposez-vous des formations en entreprise ?",
    answer:
      "Oui. Nous organisons des sessions intra-entreprise (présentiel ou distanciel) avec un programme sur mesure, un planning flexible et un suivi post-formation.",
  },
  {
    question: "Comment obtenir un devis ?",
    answer:
      "Contactez-nous via le formulaire ou prenez rendez-vous. Indiquez le domaine, le nombre de participants et vos contraintes : nous vous proposons un devis personnalisé sous 24 à 48 heures.",
  },
  {
    question: "Les formations sont-elles certifiantes ?",
    answer:
      "Nous délivrons une attestation de participation. Selon le parcours et le besoin, nous pouvons orienter vers des certifications éditeurs ou des référentiels reconnus.",
  },
  {
    question: "Les tarifs affichés sont-ils définitifs ?",
    answer:
      "Les montants indiqués sont indicatifs (par participant, hors options). Un devis personnalisé tient compte du format (intra/inter), du lieu et du nombre de stagiaires.",
  },
];

export const formationsPageCopy = {
  intro: {
    eyebrow: "Catalogue",
    title: "Des formations",
    highlight: "pour tous les niveaux",
    description:
      "Du développement web à l'intelligence artificielle, de la cybersécurité à la bureautique — montez en compétences avec SD CREATIV, en Côte d'Ivoire et à distance.",
  },
  catalog: {
    eyebrow: "Domaines",
    title: "Explorez nos",
    highlight: "14 domaines",
    description:
      "Ouvrez la fiche détaillée d’un domaine pour découvrir le programme, les objectifs, les tarifs indicatifs et les modalités.",
  },
  cta: {
    title: "Besoin d'un programme sur mesure ?",
    description:
      "Dites-nous vos objectifs, votre public et vos délais — nous construisons la formation adaptée.",
    primary: "Demander un devis",
    secondary: "Prendre rendez-vous",
  },
  faqHeading: "Questions fréquentes",
} as const;

/** Contenu EN pour la page /en/training */
export const formationsPageCopyEn = {
  hero: {
    eyebrow: "Training",
    title: "Professional training",
    highlight: "that builds real skills",
    description:
      "Web & mobile development, AI, cybersecurity, cloud, databases, digital marketing and more — for individuals, teams and public organizations.",
  },
  intro:
    "Browse our full French catalog or contact us for a tailored training plan in English or French.",
  cta: "Request a quote",
  viewFr: "View full catalog (French)",
} as const;
