/** Overlays EN pour le contenu public (ids alignés sur le catalogue FR). */

export const servicesEnById: Record<
  string,
  {
    title: string;
    description: string;
    features: string[];
    detailLabel?: string;
    imageAlt?: string;
  }
> = {
  "site-vitrine": {
    title: "Showcase website",
    description:
      "A professional site to present your business and turn visitors into customers.",
    features: [
      "3–7 custom pages",
      "Responsive design",
      "Contact form",
      "WhatsApp integration",
      "Basic SEO",
    ],
    imageAlt: "Professional showcase website on desktop and mobile",
  },
  "e-commerce": {
    title: "E-commerce",
    description:
      "Sell online with a fast, secure store that is easy to manage day to day.",
    features: [
      "Product catalog",
      "Order management",
      "Online payments",
      "Admin dashboard",
      "Handover training",
    ],
    imageAlt: "E-commerce interface with product catalog and cart",
  },
  "refonte-web": {
    title: "Website redesign",
    description:
      "Modernize your existing site to improve brand, performance and user experience.",
    features: [
      "Fresh design",
      "Mobile optimization",
      "Performance improvements",
      "UX/UI redesign",
      "Safe migration",
    ],
    imageAlt: "Before/after website redesign comparison",
  },
  "identite-visuelle": {
    title: "Visual identity",
    description:
      "Build a coherent, memorable brand across every touchpoint.",
    features: [
      "Logo design",
      "Marketing assets",
      "Social media kit",
      "Brand guidelines",
      "Print & web applications",
    ],
    imageAlt: "Visual identity: logo, colors and brand guidelines",
  },
  "seo-local": {
    title: "Local SEO",
    description:
      "Get found on Google and attract customers near you.",
    features: [
      "Google Business optimization",
      "SEO structure",
      "Local ranking",
      "Optimized content",
      "Performance tracking",
    ],
    imageAlt: "Local SEO with Google Maps and analytics",
  },
  maintenance: {
    title: "Maintenance",
    description:
      "Keep your site fast, secure and up to date with ongoing support.",
    features: [
      "Regular backups",
      "Technical assistance",
      "Updates",
      "Monitoring",
      "Responsive support",
    ],
    detailLabel: "Maintenance & SLA plans",
    imageAlt: "Website maintenance and technical support",
  },
  "agents-ia": {
    title: "AI agents",
    description:
      "We design and deploy intelligent agents to automate interactions, support and business workflows.",
    features: [
      "Chatbots & conversational assistants",
      "LLM integration (OpenAI, Claude, etc.)",
      "Custom business agents",
      "Connected to your tools (CRM, email, WhatsApp)",
      "Monitoring & continuous improvement",
    ],
    detailLabel: "Explore our AI solutions",
    imageAlt: "AI agent configuration interface",
  },
  automatisation: {
    title: "Automation",
    description:
      "Automate repetitive tasks and connect your apps to save time and reduce errors.",
    features: [
      "Automated workflows (n8n, Make, Zapier)",
      "API & webhook integrations",
      "Data synchronization",
      "Smart notifications & alerts",
      "Dashboards & flow monitoring",
    ],
    imageAlt: "Automated workflows connecting multiple apps",
  },
  devops: {
    title: "DevOps",
    description:
      "Industrialize deployments and secure your delivery pipeline to ship faster with confidence.",
    features: [
      "CI/CD pipelines (GitHub Actions, GitLab)",
      "Docker containerization",
      "Monitoring, logs & alerts",
      "Infrastructure as Code (Terraform, Ansible)",
      "Security practices & code review",
    ],
    imageAlt: "DevOps dashboard with CI/CD and monitoring",
  },
  cloud: {
    title: "Cloud",
    description:
      "Hosting, migration and cloud optimization for scalable, available and high-performing apps.",
    features: [
      "AWS, Google Cloud, Azure & Vercel",
      "Cloud migration",
      "High-availability architecture",
      "Cloud cost optimization",
      "Backups & disaster recovery",
    ],
    imageAlt: "Scalable cloud architecture with performance metrics",
  },
  "applications-mobiles": {
    title: "Mobile apps",
    description:
      "High-performing iOS and Android apps to engage customers and digitize your services.",
    features: [
      "Native & cross-platform (React Native, Flutter)",
      "Mobile-first UI/UX",
      "Push notifications",
      "Connected to your site or back office",
      "App Store & Google Play publishing",
    ],
    imageAlt: "iOS and Android mobile apps",
  },
  "developpement-sur-mesure": {
    title: "Custom development",
    description:
      "Web platforms, SaaS and business tools built around your exact processes.",
    features: [
      "Custom web apps & SaaS",
      "Client portals & intranets",
      "APIs & third-party integrations",
      "Dashboards & reporting",
      "Long-term scalability & maintenance",
    ],
    imageAlt: "Custom web platform with business modules",
  },
};

export const quoteLabelsEn = {
  projectTypes: {
    "site-vitrine": "Showcase website",
    "e-commerce": "E-commerce",
    "refonte-web": "Website redesign",
    "identite-visuelle": "Visual identity",
    "seo-local": "Local SEO",
    maintenance: "Maintenance (annual plan)",
    "agents-ia": "AI agents",
    automatisation: "Automation",
    devops: "DevOps",
    cloud: "Cloud",
    "applications-mobiles": "Mobile apps",
    "developpement-sur-mesure": "Custom development",
  } as Record<string, string>,
  pageTiers: {
    "1-5": "1–5 pages (included)",
    "6-10": "6–10 pages",
    "11-20": "11–20 pages",
    "20-plus": "More than 20 pages",
  } as Record<string, string>,
  addons: {
    blog: "Blog module",
    "seo-avance": "Advanced SEO",
    multilangue: "Multilingual site (FR/EN)",
    cms: "Self-serve CMS",
    "mobile-money": "Mobile Money payments",
    whatsapp: "WhatsApp Business integration",
    formation: "Admin training (2h)",
    "maintenance-3mois": "Priority support — 3 months",
    "prise-rdv": "Online booking module",
    "espace-client": "Client portal",
    "live-chat": "Live chat with advisor",
    "analytics-conversions": "Analytics & conversion tracking (GA4)",
    "redaction-contenus": "Content writing (key pages)",
    "pack-photo-video": "Professional photo / video pack",
    "hebergement-1an": "Hosting & domain (1 year)",
    "securite-waf": "Hardened security (WAF, backups)",
    "integrations-api-crm": "API / CRM integrations",
    emailing: "Transactional email / newsletters",
    "ui-ux-audit": "UI/UX audit & optimization",
    "formation-equipe": "Team training (half-day)",
  } as Record<string, string>,
};

export function labelEn(
  map: Record<string, string>,
  id: string,
  fallback: string,
): string {
  return map[id] ?? fallback;
}

export const auditContentEn = {
  points: [
    {
      icon: "Gauge" as const,
      title: "Performance",
      description: "Load speed, Lighthouse score and practical optimizations.",
    },
    {
      icon: "Search" as const,
      title: "SEO & visibility",
      description: "Google ranking, structure, meta tags and local presence.",
    },
    {
      icon: "Smartphone" as const,
      title: "Mobile experience",
      description: "Responsive layout, readability and smartphone journeys.",
    },
    {
      icon: "Shield" as const,
      title: "Security & technical health",
      description: "HTTPS, outdated plugins, backups and best practices.",
    },
  ],
  checklist: [
    "Full review of your existing website",
    "PDF report with scores and recommendations",
    "Redesign estimate if needed",
    "No commitment — 100% free",
  ],
  formTitle: "Request your free audit",
};

export const maintenancePlansEn = [
  {
    id: "essentiel",
    name: "Essential",
    tagline: "Core updates and monitoring",
    sla: "48h",
    responseTime: "Within 48 business hours",
    features: [
      "Weekly backups",
      "Security updates",
      "Uptime monitoring",
      "Email support",
    ],
  },
  {
    id: "professionnel",
    name: "Professional",
    tagline: "For growing businesses",
    sla: "24h",
    responseTime: "Within 24 business hours",
    features: [
      "Everything in Essential",
      "Performance checks",
      "Content minor updates",
      "Priority email & WhatsApp",
      "Monthly report",
    ],
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Full peace of mind",
    sla: "4h",
    responseTime: "Within 4 business hours",
    features: [
      "Everything in Professional",
      "Dedicated support channel",
      "Proactive improvements",
      "Incident response priority",
      "Quarterly strategy call",
    ],
  },
] as const;

export const solutionsIaEn = {
  useCasesTitle: "Use cases",
  useCasesHighlight: "that create value",
  useCases: [
    {
      id: "support",
      title: "24/7 customer support",
      description:
        "Answer frequent questions instantly on your website, WhatsApp or email — even outside office hours.",
      benefits: [
        "Fewer calls and emails",
        "Faster responses",
        "Consistent brand voice",
      ],
    },
    {
      id: "leads",
      title: "Lead qualification",
      description:
        "Qualify prospects automatically and hand warm leads to your sales team.",
      benefits: [
        "Better conversion rates",
        "Less time on low-intent leads",
        "CRM-ready summaries",
      ],
    },
    {
      id: "ops",
      title: "Operations automation",
      description:
        "Connect your tools and automate repetitive internal workflows.",
      benefits: [
        "Hours saved every week",
        "Fewer manual errors",
        "Clear audit trail",
      ],
    },
  ],
  packs: [
    {
      id: "starter",
      name: "Starter agent",
      tagline: "FAQ assistant on your site",
      features: [
        "Website chat widget",
        "Knowledge base setup",
        "Basic analytics",
        "Email handoff",
      ],
      highlighted: false,
    },
    {
      id: "business",
      name: "Business agent",
      tagline: "Leads + WhatsApp",
      features: [
        "Everything in Starter",
        "WhatsApp channel",
        "Lead qualification flows",
        "CRM / email integration",
        "Monthly optimization",
      ],
      highlighted: true,
    },
    {
      id: "custom",
      name: "Custom agent",
      tagline: "Built around your processes",
      features: [
        "Multi-channel orchestration",
        "Custom tools & APIs",
        "Role-based workflows",
        "Security & compliance review",
        "Dedicated success follow-up",
      ],
      highlighted: false,
    },
  ],
  faq: [
    {
      question: "Do I need a large team to run an AI agent?",
      answer:
        "No. We design, deploy and monitor the agent with you. Your team stays focused on high-value conversations.",
    },
    {
      question: "Can the agent speak French and English?",
      answer:
        "Yes. Multilingual agents are common for SMEs serving Côte d'Ivoire and the diaspora.",
    },
    {
      question: "How do we start?",
      answer:
        "Book a short discovery call or request a quote. We scope the use case, data sources and rollout plan.",
    },
  ],
};

export const legalNoticeEn = {
  sections: [
    {
      title: "Publisher",
      body: "SD CREATIV is a digital agency based in Abidjan, Côte d'Ivoire. For any request, contact us via the contact form or the email address published on this website.",
    },
    {
      title: "Hosting",
      body: "The website is hosted on infrastructure operated by SD CREATIV and its cloud providers. Technical details may be updated without prior notice when infrastructure changes.",
    },
    {
      title: "Intellectual property",
      body: "All texts, visuals, logos and code on this site are protected. Any reproduction without prior written authorization is prohibited.",
    },
    {
      title: "Liability",
      body: "SD CREATIV strives to keep information accurate and up to date. We cannot guarantee uninterrupted availability of the site or absolute accuracy of every published detail.",
    },
  ],
};

export const privacyPolicyEn = {
  intro:
    "SD CREATIV protects personal data in line with GDPR principles and Côte d'Ivoire Law No. 2013-450 on the protection of personal data.",
  sections: [
    {
      title: "Data we collect",
      body: "Contact forms, quote requests, booking forms and audit requests may collect your name, email, phone number, company and project details. Technical logs and optional analytics cookies may also be processed.",
    },
    {
      title: "Purpose",
      body: "We use this data to answer your requests, prepare quotes, deliver services, improve the website and meet legal obligations.",
    },
    {
      title: "Retention",
      body: "Data is kept only as long as needed for the stated purpose, then archived or deleted according to our internal retention rules.",
    },
    {
      title: "Your rights",
      body: "You may request access, correction, deletion or limitation of your personal data by contacting us through the contact page.",
    },
    {
      title: "Cookies",
      body: "Essential cookies keep the site working. Analytics cookies are optional and only activated if you accept them in the cookie banner.",
    },
  ],
};

export const careersEn = {
  title: "Join",
  highlight: "SD CREATIV",
  description:
    "We are growing our presence in Côte d'Ivoire and with the diaspora. Explore open roles or send a spontaneous application.",
  openRolesTitle: "Open roles",
  openRoles: [
    {
      title: "Field sales representative",
      location: "Abidjan · Field",
      type: "Full-time / freelance",
      summary:
        "Identify and meet local businesses that need websites, e-commerce or digital transformation. You own the relationship from first contact to signed project.",
    },
    {
      title: "Partnerships & diaspora",
      location: "Remote + Abidjan travel",
      type: "Contract",
      summary:
        "Connect SD CREATIV with diaspora entrepreneurs and partner networks abroad who need a reliable delivery team in Côte d'Ivoire.",
    },
  ],
  ctaTitle: "No matching role?",
  ctaDescription: "Send us your profile — we keep spontaneous applications for upcoming openings.",
  ctaButton: "Contact us",
};

export const aboutEn = {
  title: "Your digital partner",
  highlight: "in Abidjan",
  description:
    "SD CREATIV helps SMEs, entrepreneurs and organizations modernize with websites, e-commerce, AI agents and long-term support.",
  valuesTitle: "What drives us",
  values: [
    {
      title: "Clarity",
      description: "Plain-language proposals, transparent scopes and free custom quotes.",
    },
    {
      title: "Delivery",
      description: "Modern stacks, responsive design and measurable business outcomes.",
    },
    {
      title: "Partnership",
      description: "Training, maintenance and ongoing advice after launch.",
    },
  ],
  methodTitle: "How we work",
  methodSteps: [
    { title: "Discover", description: "Understand your goals, audience and constraints." },
    { title: "Design", description: "Propose UX, visuals and a clear delivery plan." },
    { title: "Build", description: "Develop, test and iterate with your feedback." },
    { title: "Launch", description: "Go live with training and a support plan." },
  ],
};

export const trainingCatalogEn: Record<
  string,
  { title: string; description: string }
> = {
  "developpement-web-mobile": {
    title: "Web & mobile development",
    description: "Full-stack skills to design and ship modern applications.",
  },
  "intelligence-artificielle": {
    title: "Artificial intelligence",
    description: "Practical AI skills for teams and developers.",
  },
  "cybersecurite-devsecops": {
    title: "Cybersecurity & DevSecOps",
    description: "Train teams to secure applications end to end.",
  },
  "cloud-devops": {
    title: "Cloud, DevOps & infrastructure",
    description: "For system administrators and developers.",
  },
  "bases-de-donnees": {
    title: "Databases",
    description: "Design, query and operate reliable data layers.",
  },
  "developpement-rust": {
    title: "Rust development",
    description: "Safe systems programming for performance-critical software.",
  },
  bureautique: {
    title: "Office productivity",
    description: "Practical office tools for everyday productivity.",
  },
  "marketing-digital": {
    title: "Digital marketing",
    description: "Acquire and convert customers online.",
  },
  "creation-graphique": {
    title: "Graphic design",
    description: "Visual communication for brands and campaigns.",
  },
  "gestion-de-projet": {
    title: "Project management",
    description: "Plan, deliver and steer digital projects.",
  },
  entrepreneuriat: {
    title: "Entrepreneurship",
    description: "Build and grow a digital business.",
  },
  "management-soft-skills": {
    title: "Management & soft skills",
    description: "Leadership and collaboration for modern teams.",
  },
  "administrations-publiques": {
    title: "Public administrations",
    description: "Digital skills for public-sector teams.",
  },
  "accompagnement-conseil": {
    title: "Advisory & coaching",
    description: "Hands-on support for digital transformation.",
  },
};
