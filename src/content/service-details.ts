export type ServiceProcessStep = {
  step: string;
  title: string;
  description: string;
};

export type ServiceFaqItem = {
  question: string;
  answer: string;
};

export type ServiceDetail = {
  id: string;
  metaDescription: string;
  heroDescription: string;
  startingFrom: string;
  delay: string;
  problem: { title: string; text: string };
  solution: { title: string; text: string };
  deliverables: string[];
  process: ServiceProcessStep[];
  idealFor: string[];
  faq: ServiceFaqItem[];
  relatedRealisationIds: string[];
};

export const serviceDetails: ServiceDetail[] = [
  {
    id: "site-vitrine",
    metaDescription:
      "Création de site vitrine professionnel : design sur mesure, responsive, SEO de base, formulaire contact et WhatsApp. Devis personnalisé gratuit.",
    heroDescription:
      "Présentez votre activité avec un site clair, crédible et pensé pour convertir vos visiteurs en prospects — sur mobile comme sur ordinateur.",
    startingFrom: "Votre vitrine digitale, pensée pour convertir",
    delay: "2 à 4 semaines",
    problem: {
      title: "Votre activité mérite mieux qu'une simple page Facebook",
      text: "Sans site professionnel, vous perdez en crédibilité, en visibilité Google et en opportunités commerciales. Vos prospects comparent, puis contactent celui qui inspire confiance en quelques secondes.",
    },
    solution: {
      title: "Un site vitrine qui travaille pour vous 24 h/24",
      text: "Nous concevons un site sur mesure, rapide et facile à parcourir : présentation de vos services, preuves de confiance, formulaire de contact et appels à l'action visibles. Vous gardez la main sur vos contenus essentiels.",
    },
    deliverables: [
      "3 à 7 pages sur mesure (Accueil, Services, À propos, Contact…)",
      "Design responsive (mobile, tablette, desktop)",
      "Formulaire de contact avec notification email",
      "Bouton WhatsApp et liens réseaux sociaux",
      "SEO de base (titres, meta, structure, sitemap)",
      "Intégration Google Analytics (avec consentement cookies)",
      "Formation à la mise à jour des contenus",
      "Mise en ligne et configuration domaine",
    ],
    process: [
      {
        step: "01",
        title: "Découverte",
        description: "Échange sur votre activité, vos objectifs, vos références et le contenu disponible.",
      },
      {
        step: "02",
        title: "Maquette & validation",
        description: "Proposition graphique de la page d'accueil et de la structure du site pour validation.",
      },
      {
        step: "03",
        title: "Développement",
        description: "Intégration responsive, formulaires, optimisations performance et relecture SEO.",
      },
      {
        step: "04",
        title: "Recette & mise en ligne",
        description: "Tests multi-appareils, corrections, formation et publication sur votre domaine.",
      },
    ],
    idealFor: [
      "PME et indépendants qui veulent une présence pro",
      "Artisans, cabinets, restaurants, associations",
      "Activités locales qui veulent être trouvées sur Google",
      "Entrepreneurs qui lancent une nouvelle activité",
    ],
    faq: [
      {
        question: "Combien de pages sont incluses ?",
        answer:
          "La formule de base couvre 3 à 7 pages (Accueil, Services, À propos, Contact, etc.). Des pages supplémentaires peuvent être ajoutées selon vos besoins.",
      },
      {
        question: "Puis-je modifier le contenu moi-même ?",
        answer:
          "Oui. Nous livrons un site que vous pouvez faire évoluer, avec une formation incluse. Un CMS avancé peut être ajouté en option.",
      },
      {
        question: "Le site sera-t-il visible sur Google ?",
        answer:
          "Nous appliquons les bonnes pratiques SEO (structure, balises, performance). Pour un référencement local poussé, nous proposons aussi notre offre SEO Local.",
      },
      {
        question: "Quel est le délai moyen ?",
        answer:
          "Comptez 2 à 4 semaines selon la quantité de contenu à fournir et le nombre de pages. Un planning est validé dès le démarrage.",
      },
    ],
    relatedRealisationIds: ["restaurant-saveurs", "cabinet-conseil", "startup-tech"],
  },
  {
    id: "e-commerce",
    metaDescription:
      "Boutique en ligne sur mesure : catalogue, paiement sécurisé, gestion des commandes et tableau de bord. E-commerce pour PME.",
    heroDescription:
      "Vendez en ligne avec une boutique performante, sécurisée et simple à administrer — catalogue, panier, paiement et suivi des commandes inclus.",
    startingFrom: "Vendez en ligne avec une boutique qui vous ressemble",
    delay: "4 à 8 semaines",
    problem: {
      title: "Vendre uniquement sur les réseaux sociaux limite votre croissance",
      text: "Messages WhatsApp non tracés, stocks difficiles à suivre, paiements informels : sans boutique en ligne structurée, vous perdez du temps et de la crédibilité auprès des clients qui veulent payer en ligne.",
    },
    solution: {
      title: "Une boutique e-commerce clé en main",
      text: "Nous créons votre catalogue produits, configurons le tunnel d'achat, les moyens de paiement adaptés à votre marché et un back-office pour suivre commandes et stocks. Votre marque, votre autonomie.",
    },
    deliverables: [
      "Catalogue produits (catégories, filtres, fiches détaillées)",
      "Panier et tunnel de commande optimisé mobile",
      "Paiement en ligne sécurisé (carte, Mobile Money en option)",
      "Gestion des stocks et des commandes",
      "Tableau de bord administrateur",
      "Notifications email (commande, confirmation client)",
      "Intégration WhatsApp pour le SAV (option)",
      "Formation à l'ajout de produits et au suivi des ventes",
    ],
    process: [
      {
        step: "01",
        title: "Cadrage & catalogue",
        description: "Définition du périmètre produits, des moyens de paiement et des règles de livraison.",
      },
      {
        step: "02",
        title: "UX & design boutique",
        description: "Maquettes de la boutique, fiche produit et parcours d'achat mobile-first.",
      },
      {
        step: "03",
        title: "Développement & paiement",
        description: "Intégration technique, tests de commande, connexion aux moyens de paiement.",
      },
      {
        step: "04",
        title: "Recette & lancement",
        description: "Import des produits, formation admin, tests finaux et mise en production.",
      },
    ],
    idealFor: [
      "Commerces qui veulent vendre 24 h/24",
      "Créateurs et marques avec un catalogue produits",
      "Distributeurs qui sortent du seul Instagram / WhatsApp",
      "PME prêtes à investir dans un canal de vente durable",
    ],
    faq: [
      {
        question: "Quels moyens de paiement sont possibles ?",
        answer:
          "Carte bancaire et Stripe par défaut. Mobile Money (Orange Money, Wave, etc.) et autres passerelles peuvent être intégrés selon votre marché — en option.",
      },
      {
        question: "Puis-je gérer les produits moi-même ?",
        answer:
          "Oui. Nous livrons un back-office intuitif et une formation pour ajouter, modifier ou retirer des produits en autonomie.",
      },
      {
        question: "Combien de produits puis-je vendre ?",
        answer:
          "La boutique est dimensionnée pour votre catalogue initial (typiquement 20 à 200 références). Des évolutions sont possibles à mesure que votre activité grandit.",
      },
      {
        question: "Proposez-vous la maintenance après lancement ?",
        answer:
          "Oui. Nous proposons des formules maintenance & SLA pour mises à jour, sauvegardes et support technique continu.",
      },
    ],
    relatedRealisationIds: ["boutique-mode", "immobilier-prestige"],
  },
  {
    id: "refonte-web",
    metaDescription:
      "Refonte de site web : nouveau design, performance, mobile-first et migration sécurisée. Modernisez votre image en ligne. Devis personnalisé gratuit.",
    heroDescription:
      "Redonnez vie à un site daté : design actuel, expérience mobile fluide, temps de chargement réduit et parcours utilisateur repensé pour convertir.",
    startingFrom: "Modernisez votre image, boostez vos conversions",
    delay: "3 à 6 semaines",
    problem: {
      title: "Un site vieillissant freine votre croissance",
      text: "Design dépassé, lenteur, mauvaise expérience mobile, formulaires absents : vos visiteurs partent en quelques secondes et votre crédibilité en souffre — surtout face à des concurrents plus modernes.",
    },
    solution: {
      title: "Une refonte pensée performance et conversion",
      text: "Nous auditons l'existant, repensons l'UX/UI, migrons vos contenus en toute sécurité et livrons un site rapide, responsive et aligné avec votre image actuelle. Vous gardez votre référencement et gagnez en efficacité.",
    },
    deliverables: [
      "Audit du site existant (UX, perf, SEO, technique)",
      "Nouveau design sur mesure validé en amont",
      "Refonte responsive mobile-first",
      "Optimisation des performances (Core Web Vitals)",
      "Migration sécurisée des contenus et URLs",
      "Redirections 301 pour préserver le SEO",
      "Formulaires et intégrations conservés ou améliorés",
      "Formation et recette avant mise en production",
    ],
    process: [
      {
        step: "01",
        title: "Audit & cadrage",
        description: "Analyse du site actuel, identification des points faibles et définition des objectifs de la refonte.",
      },
      {
        step: "02",
        title: "Design & wireframes",
        description: "Proposition graphique, arborescence repensée et validation des parcours clés.",
      },
      {
        step: "03",
        title: "Développement & migration",
        description: "Intégration, reprise des contenus, optimisations performance et tests multi-appareils.",
      },
      {
        step: "04",
        title: "Recette & bascule",
        description: "Tests finaux, redirections SEO, formation et mise en ligne sans interruption.",
      },
    ],
    idealFor: [
      "Sites de plus de 3 ans avec un design daté",
      "Entreprises dont le trafic mobile dépasse 60 %",
      "Cabinets, agences et PME qui veulent plus de leads",
      "Sites lents ou difficiles à mettre à jour",
    ],
    faq: [
      {
        question: "Vais-je perdre mon référencement Google ?",
        answer:
          "Non, si la refonte est bien menée. Nous planifions les redirections 301, conservons les URLs stratégiques et vérifions la structure SEO avant la bascule.",
      },
      {
        question: "Puis-je garder mon hébergeur actuel ?",
        answer:
          "Oui, dans la plupart des cas. Nous pouvons aussi recommander une migration si l'infrastructure actuelle limite les performances.",
      },
      {
        question: "Faut-il refaire tout le contenu ?",
        answer:
          "Pas forcément. Nous réutilisons et améliorons vos textes existants. Une rédaction complète peut être proposée en option.",
      },
      {
        question: "Combien de temps dure une refonte ?",
        answer:
          "Comptez 3 à 6 semaines selon la taille du site et le niveau de redesign. Un planning détaillé est validé dès le démarrage.",
      },
    ],
    relatedRealisationIds: ["cabinet-conseil", "academy-elearning"],
  },
  {
    id: "identite-visuelle",
    metaDescription:
      "Création d'identité visuelle : logo, charte graphique, supports print et web. Image de marque cohérente pour PME. Devis personnalisé gratuit.",
    heroDescription:
      "Construisez une marque reconnaissable et professionnelle — logo, couleurs, typographies et déclinaisons pour tous vos supports digitaux et print.",
    startingFrom: "Une identité qui inspire confiance dès le premier regard",
    delay: "2 à 4 semaines",
    problem: {
      title: "Une image incohérente brouille votre message",
      text: "Logo amateur, couleurs différentes d'un support à l'autre, absence de charte : vos prospects peinent à vous identifier et votre marque manque de crédibilité face à la concurrence.",
    },
    solution: {
      title: "Une identité visuelle structurée et déclinable",
      text: "Nous définissons votre univers graphique — logo, palette, typographies, iconographie — et livrons une charte claire pour que chaque support (site, réseaux, cartes de visite) parle la même langue visuelle.",
    },
    deliverables: [
      "Création ou refonte de logo (plusieurs propositions)",
      "Palette de couleurs et typographies",
      "Charte graphique PDF (règles d'usage)",
      "Déclinaisons réseaux sociaux (avatar, bannière)",
      "Modèles cartes de visite et en-tête email",
      "Fichiers sources (SVG, PNG, formats print)",
      "Guide de tone of voice visuel (option)",
      "Accompagnement pour intégration sur votre site",
    ],
    process: [
      {
        step: "01",
        title: "Brief créatif",
        description: "Échange sur votre activité, cibles, valeurs, références et positionnement souhaité.",
      },
      {
        step: "02",
        title: "Exploration & propositions",
        description: "2 à 3 directions créatives de logo et univers graphique à valider.",
      },
      {
        step: "03",
        title: "Affinage & charte",
        description: "Retouches, finalisation du logo et rédaction de la charte graphique.",
      },
      {
        step: "04",
        title: "Livraison & déclinaisons",
        description: "Remise des fichiers sources et des supports prêts à l'emploi.",
      },
    ],
    idealFor: [
      "Entreprises qui lancent leur activité",
      "Marques avec un logo daté ou amateur",
      "PME qui veulent harmoniser site et réseaux sociaux",
      "Projets web nécessitant une base graphique solide",
    ],
    faq: [
      {
        question: "Combien de propositions de logo recevrai-je ?",
        answer:
          "Nous présentons généralement 2 à 3 directions créatives distinctes, puis affinons celle que vous retenez jusqu'à la version finale.",
      },
      {
        question: "Suis-je propriétaire des fichiers ?",
        answer:
          "Oui. À la livraison, vous recevez les fichiers sources et les droits d'utilisation complets sur votre identité.",
      },
      {
        question: "L'identité visuelle inclut-elle le site web ?",
        answer:
          "Non, c'est une prestation distincte. En revanche, nous pouvons enchaîner sur un site vitrine en reprenant directement la charte livrée.",
      },
      {
        question: "Proposez-vous des supports print ?",
        answer:
          "Oui : cartes de visite, flyers, affiches et autres déclinaisons peuvent être ajoutés selon vos besoins.",
      },
    ],
    relatedRealisationIds: ["cabinet-conseil", "startup-tech"],
  },
  {
    id: "seo-local",
    metaDescription:
      "SEO local : optimisation Google Business, référencement géolocalisé, contenus et suivi. Soyez visible près de chez vous. Devis personnalisé gratuit.",
    heroDescription:
      "Apparaissez en tête des recherches locales sur Google — fiche établissement optimisée, pages géolocalisées et contenus pensés pour attirer des clients près de vous.",
    startingFrom: "Soyez trouvé là où vos clients vous cherchent",
    delay: "4 à 8 semaines (résultats progressifs)",
    problem: {
      title: "Invisible sur Google, vous laissez des clients à vos concurrents",
      text: "Sans SEO local, votre activité n'apparaît pas dans le pack local ni sur Maps. Vos prospects tapent « près de moi » et contactent le premier résultat — rarement vous.",
    },
    solution: {
      title: "Une stratégie locale concrète et mesurable",
      text: "Nous optimisons votre fiche Google Business, structurons votre site pour le référencement local, créons des contenus ciblés par zone et mettons en place un suivi pour mesurer votre progression.",
    },
    deliverables: [
      "Audit SEO local (site + fiche Google Business)",
      "Optimisation complète de la fiche établissement",
      "Structure SEO on-page (titres, meta, schema local)",
      "Pages ou sections géolocalisées (ville, quartier)",
      "Stratégie d'avis clients Google",
      "Optimisation Google Maps et NAP (nom, adresse, tel.)",
      "Rapport de suivi mensuel (positions, trafic)",
      "Recommandations contenu et netlinking local",
    ],
    process: [
      {
        step: "01",
        title: "Audit local",
        description: "Analyse de votre visibilité actuelle, de vos concurrents locaux et de votre fiche Google.",
      },
      {
        step: "02",
        title: "Optimisation technique",
        description: "Corrections on-page, schema local, fiche Google Business et cohérence NAP.",
      },
      {
        step: "03",
        title: "Contenus & pages locales",
        description: "Création ou optimisation de pages ciblant vos zones de chalandise.",
      },
      {
        step: "04",
        title: "Suivi & ajustements",
        description: "Monitoring des positions, rapports et optimisations continues sur 3 mois minimum.",
      },
    ],
    idealFor: [
      "Commerces et artisans avec clientèle locale",
      "Restaurants, cliniques, agences immobilières",
      "Entreprises de services par zone géographique",
      "Sites vitrines qui veulent plus de trafic organique",
    ],
    faq: [
      {
        question: "En combien de temps verrai-je des résultats ?",
        answer:
          "Les premiers signaux apparaissent souvent sous 4 à 8 semaines. Le SEO local est progressif : nous visons des gains durables, pas des promesses instantanées.",
      },
      {
        question: "Faut-il déjà avoir un site web ?",
        answer:
          "Un site aide énormément, mais nous pouvons optimiser votre fiche Google Business seule. L'idéal reste site + fiche Google combinés.",
      },
      {
        question: "Gérez-vous les avis Google ?",
        answer:
          "Nous mettons en place une stratégie pour encourager les avis authentiques et répondre correctement. Nous n'achetons jamais de faux avis.",
      },
      {
        question: "Proposez-vous un suivi mensuel ?",
        answer:
          "Oui. Un reporting mensuel et des ajustements peuvent être inclus ou renouvelés via une formule maintenance.",
      },
    ],
    relatedRealisationIds: ["artisan-batiment", "restaurant-saveurs"],
  },
  {
    id: "automatisation",
    metaDescription:
      "Automatisation métier : workflows n8n, Make, Zapier, intégrations API et synchronisation de données. Gagnez du temps. Devis personnalisé gratuit.",
    heroDescription:
      "Connectez vos outils et automatisez les tâches répétitives — leads, emails, factures, stocks — pour gagner du temps et réduire les erreurs humaines.",
    startingFrom: "Gagnez du temps : automatisez l’essentiel",
    delay: "2 à 5 semaines",
    problem: {
      title: "Vos équipes perdent des heures en tâches manuelles",
      text: "Copier-coller entre Excel et WhatsApp, relances oubliées, données éparpillées : les processus manuels ralentissent votre activité et créent des erreurs coûteuses.",
    },
    solution: {
      title: "Des workflows fiables entre vos applications",
      text: "Nous cartographions vos processus, concevons des automatisations sur mesure (n8n, Make, Zapier ou API) et mettons en place des alertes pour que l'information circule sans intervention manuelle.",
    },
    deliverables: [
      "Cartographie de vos processus actuels",
      "Workflows automatisés (1 à 5 scénarios)",
      "Intégrations API, webhooks et CRM",
      "Synchronisation de données entre outils",
      "Notifications email, Slack ou WhatsApp",
      "Tableau de bord de suivi des flux",
      "Documentation des automatisations",
      "Formation à la maintenance des scénarios",
    ],
    process: [
      {
        step: "01",
        title: "Diagnostic process",
        description: "Identification des tâches répétitives, des outils utilisés et des gains potentiels.",
      },
      {
        step: "02",
        title: "Conception des flux",
        description: "Schéma des workflows, points de contrôle et règles métier à automatiser.",
      },
      {
        step: "03",
        title: "Développement & tests",
        description: "Mise en place des intégrations, tests en conditions réelles et corrections.",
      },
      {
        step: "04",
        title: "Déploiement & formation",
        description: "Activation en production, documentation et formation de votre équipe.",
      },
    ],
    idealFor: [
      "PME avec CRM, facturation ou e-commerce",
      "Équipes commerciales qui gèrent beaucoup de leads",
      "Entreprises qui veulent réduire les erreurs de saisie",
      "Structures prêtes à connecter leurs outils existants",
    ],
    faq: [
      {
        question: "Quels outils pouvez-vous connecter ?",
        answer:
          "Google Sheets, Notion, HubSpot, Pipedrive, WooCommerce, Stripe, WhatsApp Business API, email, Slack et la plupart des services disposant d'une API ou d'un connecteur.",
      },
      {
        question: "n8n, Make ou Zapier — lequel choisir ?",
        answer:
          "Zapier et Make conviennent aux besoins standards. n8n (auto-hébergé) est idéal pour plus de contrôle, de volume ou de données sensibles. Nous recommandons selon votre contexte.",
      },
      {
        question: "Que se passe-t-il si un workflow échoue ?",
        answer:
          "Nous configurons des alertes en cas d'erreur et des scénarios de repli. Un monitoring peut être ajouté via notre offre maintenance.",
      },
      {
        question: "Puis-je faire évoluer les automatisations ?",
        answer:
          "Oui. Nous livrons une documentation claire et proposons des évolutions à la demande ou via un contrat de maintenance.",
      },
    ],
    relatedRealisationIds: ["startup-tech", "ong-humanitaire"],
  },
  {
    id: "devops",
    metaDescription:
      "DevOps : pipelines CI/CD, Docker, monitoring et Infrastructure as Code. Livrez plus vite et en sécurité. Devis personnalisé gratuit.",
    heroDescription:
      "Industrialisez vos déploiements avec des pipelines CI/CD, de la conteneurisation et un monitoring fiable — pour livrer plus souvent, sans stress.",
    startingFrom: "Infrastructure fiable, déploiements sereins",
    delay: "3 à 6 semaines",
    problem: {
      title: "Des déploiements manuels = risques et lenteur",
      text: "Mises en production stressantes, environnements incohérents, absence de tests automatisés : votre équipe perd du temps et chaque release devient un pari.",
    },
    solution: {
      title: "Une chaîne DevOps robuste et reproductible",
      text: "Nous mettons en place des pipelines CI/CD, conteneurisons vos applications, automatisons les tests et configurons monitoring et alertes pour que chaque déploiement soit prévisible.",
    },
    deliverables: [
      "Audit de l'existant (infra, déploiements, outils)",
      "Pipeline CI/CD (GitHub Actions, GitLab CI…)",
      "Conteneurisation Docker (Dockerfile, compose)",
      "Environnements staging et production",
      "Tests automatisés intégrés au pipeline",
      "Monitoring, logs centralisés et alertes",
      "Documentation runbook et procédures",
      "Formation de l'équipe technique",
    ],
    process: [
      {
        step: "01",
        title: "Audit & architecture",
        description: "Analyse de votre stack, de vos pratiques actuelles et des points de friction.",
      },
      {
        step: "02",
        title: "Conception CI/CD",
        description: "Définition des pipelines, environnements et stratégie de déploiement.",
      },
      {
        step: "03",
        title: "Mise en place",
        description: "Configuration Docker, pipelines, tests et monitoring.",
      },
      {
        step: "04",
        title: "Transfert & run",
        description: "Documentation, formation équipe et premiers déploiements accompagnés.",
      },
    ],
    idealFor: [
      "Startups et équipes produit en croissance",
      "Projets avec releases fréquentes",
      "Applications nécessitant staging + production",
      "Entreprises qui veulent réduire les incidents prod",
    ],
    faq: [
      {
        question: "Travaillez-vous avec notre code existant ?",
        answer:
          "Oui. Nous nous adaptons à votre stack (Node.js, PHP, Python, etc.) et à votre hébergeur actuel ou futur.",
      },
      {
        question: "GitHub Actions ou GitLab CI ?",
        answer:
          "Les deux. Nous choisissons l'outil en fonction de votre forge Git et de vos contraintes de sécurité.",
      },
      {
        question: "Incluez-vous la sécurité dans les pipelines ?",
        answer:
          "Oui : analyse de dépendances, scans basiques et bonnes pratiques de secrets management font partie de notre approche.",
      },
      {
        question: "Proposez-vous un accompagnement continu ?",
        answer:
          "Oui, via notre offre maintenance & SLA ou des missions d'astreinte ponctuelles selon vos besoins.",
      },
    ],
    relatedRealisationIds: ["startup-tech", "immobilier-prestige"],
  },
  {
    id: "cloud",
    metaDescription:
      "Services cloud : migration AWS, GCP, Azure, Vercel, haute disponibilité et optimisation des coûts. Devis personnalisé gratuit.",
    heroDescription:
      "Hébergez et faites évoluer vos applications dans le cloud — migration sécurisée, architecture scalable et coûts maîtrisés.",
    startingFrom: "Le cloud à la hauteur de vos ambitions",
    delay: "2 à 6 semaines",
    problem: {
      title: "Une infrastructure rigide ou coûteuse vous freine",
      text: "Serveur unique sans redondance, factures cloud imprévisibles, difficultés à absorber les pics de trafic : votre infrastructure ne suit plus la croissance de votre activité.",
    },
    solution: {
      title: "Une architecture cloud adaptée à vos enjeux",
      text: "Nous concevons, migrons et optimisons votre infrastructure sur AWS, Google Cloud, Azure ou Vercel — avec sauvegardes, monitoring et plan de reprise pour garantir disponibilité et performance.",
    },
    deliverables: [
      "Audit infrastructure et estimation des coûts",
      "Architecture cloud (schéma, sizing, zones)",
      "Migration planifiée avec rollback",
      "Configuration haute disponibilité (selon besoin)",
      "Sauvegardes automatiques et restauration testée",
      "Optimisation des coûts (reserved, scaling)",
      "Monitoring et alertes (uptime, ressources)",
      "Documentation et transfert de compétences",
    ],
    process: [
      {
        step: "01",
        title: "Audit & cadrage",
        description: "Inventaire des applications, contraintes métier, budget et objectifs de disponibilité.",
      },
      {
        step: "02",
        title: "Architecture",
        description: "Conception de l'infra cible, choix du provider et plan de migration.",
      },
      {
        step: "03",
        title: "Migration",
        description: "Déploiement progressif, tests de charge et bascule DNS contrôlée.",
      },
      {
        step: "04",
        title: "Optimisation & run",
        description: "Ajustement des coûts, monitoring actif et documentation opérationnelle.",
      },
    ],
    idealFor: [
      "Applications web avec trafic variable",
      "Projets quittant un hébergement mutualisé",
      "SaaS et plateformes nécessitant de la scalabilité",
      "Entreprises soucieuses de la continuité de service",
    ],
    faq: [
      {
        question: "Quel cloud recommandez-vous ?",
        answer:
          "Vercel pour les apps Next.js, AWS/GCP pour les projets complexes, Azure pour les environnements Microsoft. Nous recommandons selon votre stack et budget.",
      },
      {
        question: "La migration entraîne-t-elle une coupure ?",
        answer:
          "Nous planifions pour minimiser l'interruption : bascule DNS, double run temporaire et fenêtre de maintenance validée avec vous.",
      },
      {
        question: "Comment maîtriser les coûts cloud ?",
        answer:
          "Alertes budgétaires, right-sizing, réservations et revue mensuelle des ressources inutilisées font partie de notre approche.",
      },
      {
        question: "Gérez-vous les sauvegardes ?",
        answer:
          "Oui. Sauvegardes automatiques, rétention configurable et tests de restauration pour limiter les risques de perte de données.",
      },
    ],
    relatedRealisationIds: ["immobilier-prestige", "ong-humanitaire"],
  },
  {
    id: "applications-mobiles",
    metaDescription:
      "Développement d'applications mobiles iOS et Android : React Native, Flutter, UI/UX mobile-first. Devis personnalisé gratuit.",
    heroDescription:
      "Touchez vos clients sur iOS et Android avec une application performante, intuitive et connectée à votre écosystème digital existant.",
    startingFrom: "Une app mobile qui reste dans la poche de vos clients",
    delay: "8 à 16 semaines",
    problem: {
      title: "Un site seul ne suffit plus pour fidéliser",
      text: "Vos clients passent leur temps sur mobile. Sans application dédiée, vous manquez de notifications, de parcours fluides et de présence sur l'écran d'accueil de vos utilisateurs.",
    },
    solution: {
      title: "Une app mobile alignée sur vos objectifs métier",
      text: "Nous concevons et développons des applications natives ou cross-platform (React Native, Flutter) avec une UX mobile-first, des notifications push et une connexion à votre site ou back-office.",
    },
    deliverables: [
      "Cadrage fonctionnel et wireframes mobile",
      "Design UI/UX iOS et Android",
      "Développement cross-platform ou natif",
      "Authentification et espace utilisateur",
      "Notifications push",
      "Connexion API / site / back-office",
      "Tests sur appareils réels",
      "Soumission App Store et Google Play",
    ],
    process: [
      {
        step: "01",
        title: "Cadrage & UX",
        description: "Définition du périmètre MVP, parcours utilisateur et maquettes interactives.",
      },
      {
        step: "02",
        title: "Design UI",
        description: "Interfaces iOS/Android cohérentes avec votre identité visuelle.",
      },
      {
        step: "03",
        title: "Développement",
        description: "Codage, intégration API, tests unitaires et tests sur devices.",
      },
      {
        step: "04",
        title: "Publication & suivi",
        description: "Soumission stores, corrections review Apple/Google et support post-lancement.",
      },
    ],
    idealFor: [
      "Services nécessitant un accès mobile fréquent",
      "Plateformes avec espace client ou membre",
      "Commerces voulant fidéliser via notifications",
      "Projets digitaux déjà dotés d'un back-end",
    ],
    faq: [
      {
        question: "React Native ou Flutter ?",
        answer:
          "React Native si votre écosystème est JavaScript/TypeScript. Flutter pour des UI très custom ou des performances spécifiques. Nous recommandons après le cadrage.",
      },
      {
        question: "Faut-il développer iOS et Android séparément ?",
        answer:
          "Pas forcément. Le cross-platform permet une base de code unique pour les deux stores, réduisant coûts et délais pour la majorité des projets.",
      },
      {
        question: "Gérez-vous la publication sur les stores ?",
        answer:
          "Oui. Nous accompagnons la création des comptes développeur, la soumission et les éventuels retours Apple ou Google.",
      },
      {
        question: "L'app peut-elle se connecter à mon site existant ?",
        answer:
          "Oui. Nous connectons l'application à votre API, CMS ou base de données via des endpoints sécurisés.",
      },
    ],
    relatedRealisationIds: ["clinique-sante", "boutique-mode"],
  },
  {
    id: "developpement-sur-mesure",
    metaDescription:
      "Développement sur mesure : SaaS, portails clients, APIs et tableaux de bord. Solutions web adaptées à vos processus. Devis personnalisé gratuit.",
    heroDescription:
      "Quand le prêt-à-l'emploi ne suffit plus — nous concevons plateformes web, SaaS et outils métier taillés pour vos processus et votre croissance.",
    startingFrom: "Des solutions sur mesure, calibrées pour votre métier",
    delay: "6 à 16 semaines",
    problem: {
      title: "Les outils génériques plafonnent votre efficacité",
      text: "Excel, WhatsApp et logiciels inadaptés : vos processus métier uniques ne trouvent pas de solution standard. Résultat — perte de temps, données fragmentées et impossible de scaler.",
    },
    solution: {
      title: "Une plateforme pensée pour votre métier",
      text: "Nous analysons vos workflows, concevons une architecture évolutive et développons une application web sur mesure — portail client, SaaS, intranet ou API — avec tableaux de bord et intégrations tierces.",
    },
    deliverables: [
      "Atelier de cadrage et spécifications fonctionnelles",
      "Architecture technique et maquettes UX",
      "Développement front-end et back-end",
      "Authentification, rôles et permissions",
      "APIs REST ou GraphQL documentées",
      "Tableaux de bord et reporting",
      "Intégrations tierces (paiement, CRM, email…)",
      "Tests, déploiement et documentation",
    ],
    process: [
      {
        step: "01",
        title: "Discovery",
        description: "Compréhension fine de vos processus, contraintes métier et objectifs mesurables.",
      },
      {
        step: "02",
        title: "Conception",
        description: "Spécifications, wireframes, architecture technique et planning par sprints.",
      },
      {
        step: "03",
        title: "Développement agile",
        description: "Livraisons incrémentales, démos régulières et ajustements en cours de route.",
      },
      {
        step: "04",
        title: "Recette & mise en prod",
        description: "Tests utilisateurs, corrections, formation et déploiement sécurisé.",
      },
    ],
    idealFor: [
      "Entreprises avec processus métier spécifiques",
      "Projets SaaS ou marketplaces",
      "Portails clients et intranets",
      "Organisations prêtes à investir dans le long terme",
    ],
    faq: [
      {
        question: "Par où commencer un projet sur mesure ?",
        answer:
          "Par un atelier de cadrage (1 à 2 jours) pour définir le périmètre MVP, le budget et le planning. Nous pouvons ensuite enchaîner par phases.",
      },
      {
        question: "Quelle stack technique utilisez-vous ?",
        answer:
          "Principalement Next.js, TypeScript, PostgreSQL et des APIs modernes. Nous adaptons la stack à vos contraintes existantes.",
      },
      {
        question: "Puis-je faire évoluer la plateforme après le lancement ?",
        answer:
          "Oui. Nous concevons des architectures évolutives et proposons maintenance, SLA et développement de nouvelles fonctionnalités.",
      },
      {
        question: "Propriété du code et des données ?",
        answer:
          "Vous êtes propriétaire du code livré et de vos données. Nous fournissons la documentation et les accès nécessaires.",
      },
    ],
    relatedRealisationIds: ["immobilier-prestige", "academy-elearning", "ong-humanitaire"],
  },
];

export function getServiceDetail(id: string): ServiceDetail | undefined {
  return serviceDetails.find((d) => d.id === id);
}

export function getServiceDetailSlugs(): string[] {
  return serviceDetails.map((d) => d.id);
}

export function hasServiceDetail(id: string): boolean {
  return serviceDetails.some((d) => d.id === id);
}
