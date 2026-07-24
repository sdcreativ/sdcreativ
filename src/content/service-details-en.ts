import type { ServiceDetail } from "@/content/service-details";

export const serviceDetailsEn: ServiceDetail[] = [
  {
    id: "site-vitrine",
    metaDescription:
      "Professional business website design: custom layout, responsive, basic SEO, contact form and WhatsApp. Free personalized quote.",
    heroDescription:
      "Present your business with a clear, credible website built to turn visitors into leads — on mobile and desktop.",
    startingFrom: "Your digital storefront, built to convert",
    delay: "2–4 weeks",
    problem: {
      title: "Your business deserves more than a Facebook page",
      text: "Without a professional website, you lose credibility, Google visibility, and sales opportunities. Prospects compare options, then contact whoever inspires trust within seconds.",
    },
    solution: {
      title: "A business website that works for you 24/7",
      text: "We design a custom site that is fast and easy to browse: your services, trust signals, a contact form, and clear calls to action. You stay in control of your essential content.",
    },
    deliverables: [
      "3 to 7 custom pages (Home, Services, About, Contact…)",
      "Responsive design (mobile, tablet, desktop)",
      "Contact form with email notification",
      "WhatsApp button and social media links",
      "Basic SEO (titles, meta, structure, sitemap)",
      "Google Analytics integration (with cookie consent)",
      "Training to update your content",
      "Go-live and domain setup",
    ],
    process: [
      {
        step: "01",
        title: "Discovery",
        description: "Discussion of your business, goals, references, and available content.",
      },
      {
        step: "02",
        title: "Mockup & approval",
        description: "Homepage design proposal and site structure for validation.",
      },
      {
        step: "03",
        title: "Development",
        description: "Responsive build, forms, performance optimizations, and SEO review.",
      },
      {
        step: "04",
        title: "QA & launch",
        description: "Multi-device testing, fixes, training, and publication on your domain.",
      },
    ],
    idealFor: [
      "SMBs and freelancers who want a professional presence",
      "Tradespeople, practices, restaurants, associations",
      "Local businesses that want to be found on Google",
      "Entrepreneurs launching a new venture",
    ],
    faq: [
      {
        question: "How many pages are included?",
        answer:
          "The base package covers 3 to 7 pages (Home, Services, About, Contact, etc.). Extra pages can be added based on your needs.",
      },
      {
        question: "Can I edit the content myself?",
        answer:
          "Yes. We deliver a site you can evolve, with training included. An advanced CMS can be added as an option.",
      },
      {
        question: "Will the site show up on Google?",
        answer:
          "We apply SEO best practices (structure, tags, performance). For deeper local ranking, we also offer our Local SEO package.",
      },
      {
        question: "What is the typical timeline?",
        answer:
          "Expect 2–4 weeks depending on how much content you provide and the number of pages. A schedule is confirmed at kickoff.",
      },
    ],
    relatedRealisationIds: ["restaurant-saveurs", "cabinet-conseil", "startup-tech"],
  },
  {
    id: "e-commerce",
    metaDescription:
      "Custom online store: catalog, secure checkout, order management, and admin dashboard. E-commerce for SMBs.",
    heroDescription:
      "Sell online with a high-performing, secure store that is simple to manage — catalog, cart, payments, and order tracking included.",
    startingFrom: "Sell online with a store that feels like yours",
    delay: "4–8 weeks",
    problem: {
      title: "Selling only on social media limits your growth",
      text: "Untracked WhatsApp messages, hard-to-follow inventory, informal payments: without a structured online store, you waste time and lose credibility with customers who want to pay online.",
    },
    solution: {
      title: "A turnkey e-commerce store",
      text: "We build your product catalog, configure the checkout flow, payment methods suited to your market, and a back office to track orders and stock. Your brand, your autonomy.",
    },
    deliverables: [
      "Product catalog (categories, filters, detailed pages)",
      "Cart and mobile-optimized checkout funnel",
      "Secure online payments (card; Mobile Money optional)",
      "Inventory and order management",
      "Admin dashboard",
      "Email notifications (order, customer confirmation)",
      "WhatsApp integration for support (optional)",
      "Training to add products and track sales",
    ],
    process: [
      {
        step: "01",
        title: "Scope & catalog",
        description: "Define product scope, payment methods, and delivery rules.",
      },
      {
        step: "02",
        title: "Store UX & design",
        description: "Store mockups, product page, and mobile-first shopping journey.",
      },
      {
        step: "03",
        title: "Build & payments",
        description: "Technical integration, order testing, and payment gateway connection.",
      },
      {
        step: "04",
        title: "QA & launch",
        description: "Product import, admin training, final tests, and go-live.",
      },
    ],
    idealFor: [
      "Retailers who want to sell 24/7",
      "Creators and brands with a product catalog",
      "Distributors moving beyond Instagram / WhatsApp alone",
      "SMBs ready to invest in a lasting sales channel",
    ],
    faq: [
      {
        question: "Which payment methods are available?",
        answer:
          "Card payments and Stripe by default. Mobile Money (Orange Money, Wave, etc.) and other gateways can be integrated for your market — as an option.",
      },
      {
        question: "Can I manage products myself?",
        answer:
          "Yes. We deliver an intuitive back office and training so you can add, edit, or remove products on your own.",
      },
      {
        question: "How many products can I sell?",
        answer:
          "The store is sized for your initial catalog (typically 20 to 200 SKUs). It can grow as your business expands.",
      },
      {
        question: "Do you offer maintenance after launch?",
        answer:
          "Yes. We offer maintenance & SLA plans for updates, backups, and ongoing technical support.",
      },
    ],
    relatedRealisationIds: ["boutique-mode", "immobilier-prestige"],
  },
  {
    id: "refonte-web",
    metaDescription:
      "Website redesign: new design, performance, mobile-first, and secure migration. Modernize your online image. Free personalized quote.",
    heroDescription:
      "Bring a dated site back to life: modern design, smooth mobile experience, faster load times, and a user journey rebuilt to convert.",
    startingFrom: "Modernize your image, boost conversions",
    delay: "3–6 weeks",
    problem: {
      title: "An aging website holds back your growth",
      text: "Outdated design, slow pages, poor mobile experience, missing forms: visitors leave in seconds and your credibility suffers — especially against more modern competitors.",
    },
    solution: {
      title: "A redesign built for performance and conversion",
      text: "We audit what you have, rethink UX/UI, migrate your content safely, and deliver a fast, responsive site aligned with your current brand. You keep your SEO and gain efficiency.",
    },
    deliverables: [
      "Audit of the existing site (UX, performance, SEO, technical)",
      "New custom design approved upfront",
      "Mobile-first responsive redesign",
      "Performance optimization (Core Web Vitals)",
      "Secure migration of content and URLs",
      "301 redirects to preserve SEO",
      "Forms and integrations kept or improved",
      "Training and QA before go-live",
    ],
    process: [
      {
        step: "01",
        title: "Audit & scoping",
        description: "Analysis of the current site, weak points, and redesign goals.",
      },
      {
        step: "02",
        title: "Design & wireframes",
        description: "Visual proposal, reworked sitemap, and validation of key journeys.",
      },
      {
        step: "03",
        title: "Build & migration",
        description: "Integration, content migration, performance work, and multi-device testing.",
      },
      {
        step: "04",
        title: "QA & cutover",
        description: "Final tests, SEO redirects, training, and go-live without downtime.",
      },
    ],
    idealFor: [
      "Sites over 3 years old with a dated look",
      "Businesses with more than 60% mobile traffic",
      "Practices, agencies, and SMBs that want more leads",
      "Slow sites or ones that are hard to update",
    ],
    faq: [
      {
        question: "Will I lose my Google rankings?",
        answer:
          "No, if the redesign is done properly. We plan 301 redirects, keep strategic URLs, and verify SEO structure before cutover.",
      },
      {
        question: "Can I keep my current host?",
        answer:
          "Yes, in most cases. We can also recommend a migration if your current setup limits performance.",
      },
      {
        question: "Do we need to rewrite all the content?",
        answer:
          "Not necessarily. We reuse and improve your existing copy. Full rewrite can be offered as an option.",
      },
      {
        question: "How long does a redesign take?",
        answer:
          "Expect 3–6 weeks depending on site size and redesign depth. A detailed schedule is confirmed at kickoff.",
      },
    ],
    relatedRealisationIds: ["cabinet-conseil", "academy-elearning"],
  },
  {
    id: "identite-visuelle",
    metaDescription:
      "Visual identity design: logo, brand guidelines, print and web assets. Coherent branding for SMBs. Free personalized quote.",
    heroDescription:
      "Build a recognizable, professional brand — logo, colors, typography, and applications for all your digital and print materials.",
    startingFrom: "An identity that builds trust at first glance",
    delay: "2–4 weeks",
    problem: {
      title: "An inconsistent image blurs your message",
      text: "Amateur logo, different colors on every asset, no guidelines: prospects struggle to recognize you, and your brand lacks credibility against the competition.",
    },
    solution: {
      title: "A structured, scalable visual identity",
      text: "We define your graphic system — logo, palette, typography, iconography — and deliver clear guidelines so every touchpoint (website, social, business cards) speaks the same visual language.",
    },
    deliverables: [
      "Logo creation or redesign (multiple concepts)",
      "Color palette and typography",
      "Brand guidelines PDF (usage rules)",
      "Social media assets (avatar, banner)",
      "Business card and email signature templates",
      "Source files (SVG, PNG, print formats)",
      "Visual tone-of-voice guide (optional)",
      "Support to apply the brand on your website",
    ],
    process: [
      {
        step: "01",
        title: "Creative brief",
        description: "Discussion of your business, audience, values, references, and desired positioning.",
      },
      {
        step: "02",
        title: "Exploration & concepts",
        description: "2 to 3 distinct logo and visual directions for review.",
      },
      {
        step: "03",
        title: "Refinement & guidelines",
        description: "Revisions, final logo, and brand guideline documentation.",
      },
      {
        step: "04",
        title: "Delivery & applications",
        description: "Handover of source files and ready-to-use brand assets.",
      },
    ],
    idealFor: [
      "Businesses launching their brand",
      "Brands with a dated or amateur logo",
      "SMBs that want website and socials to match",
      "Web projects that need a solid visual foundation",
    ],
    faq: [
      {
        question: "How many logo concepts will I receive?",
        answer:
          "We typically present 2 to 3 distinct creative directions, then refine the one you choose until the final version.",
      },
      {
        question: "Do I own the files?",
        answer:
          "Yes. On delivery, you receive the source files and full usage rights for your identity.",
      },
      {
        question: "Does visual identity include the website?",
        answer:
          "No — that is a separate service. We can follow up with a business website using the guidelines we deliver.",
      },
      {
        question: "Do you offer print materials?",
        answer:
          "Yes: business cards, flyers, posters, and other applications can be added based on your needs.",
      },
    ],
    relatedRealisationIds: ["cabinet-conseil", "startup-tech"],
  },
  {
    id: "seo-local",
    metaDescription:
      "Local SEO: Google Business optimization, geo-targeted ranking, content, and tracking. Get found near you. Free personalized quote.",
    heroDescription:
      "Show up at the top of local Google searches — optimized business profile, location pages, and content designed to attract nearby customers.",
    startingFrom: "Be found where your customers are searching",
    delay: "4–8 weeks (progressive results)",
    problem: {
      title: "Invisible on Google, you leave customers to competitors",
      text: "Without local SEO, your business does not appear in the local pack or on Maps. Prospects search “near me” and contact the first result — rarely you.",
    },
    solution: {
      title: "A concrete, measurable local strategy",
      text: "We optimize your Google Business Profile, structure your site for local ranking, create zone-targeted content, and set up tracking so you can measure progress.",
    },
    deliverables: [
      "Local SEO audit (website + Google Business Profile)",
      "Full business profile optimization",
      "On-page SEO structure (titles, meta, local schema)",
      "Geo-targeted pages or sections (city, neighborhood)",
      "Google review strategy",
      "Google Maps and NAP optimization (name, address, phone)",
      "Monthly tracking report (rankings, traffic)",
      "Content and local link-building recommendations",
    ],
    process: [
      {
        step: "01",
        title: "Local audit",
        description: "Analysis of your current visibility, local competitors, and Google profile.",
      },
      {
        step: "02",
        title: "Technical optimization",
        description: "On-page fixes, local schema, Google Business Profile, and NAP consistency.",
      },
      {
        step: "03",
        title: "Local content & pages",
        description: "Creation or optimization of pages targeting your service areas.",
      },
      {
        step: "04",
        title: "Tracking & iteration",
        description: "Ranking monitoring, reports, and ongoing optimizations for at least 3 months.",
      },
    ],
    idealFor: [
      "Local shops and trades with nearby customers",
      "Restaurants, clinics, real estate agencies",
      "Service businesses tied to geographic areas",
      "Business websites that want more organic traffic",
    ],
    faq: [
      {
        question: "How soon will I see results?",
        answer:
          "Early signals often appear within 4–8 weeks. Local SEO is progressive: we aim for lasting gains, not instant promises.",
      },
      {
        question: "Do I already need a website?",
        answer:
          "A website helps a lot, but we can optimize your Google Business Profile alone. The best setup is website + Google profile together.",
      },
      {
        question: "Do you manage Google reviews?",
        answer:
          "We set up a strategy to encourage genuine reviews and respond properly. We never buy fake reviews.",
      },
      {
        question: "Do you offer monthly follow-up?",
        answer:
          "Yes. Monthly reporting and adjustments can be included or renewed through a maintenance plan.",
      },
    ],
    relatedRealisationIds: ["artisan-batiment", "restaurant-saveurs"],
  },
  {
    id: "automatisation",
    metaDescription:
      "Business automation: n8n, Make, Zapier workflows, API integrations, and data sync. Save time. Free personalized quote.",
    heroDescription:
      "Connect your tools and automate repetitive tasks — leads, emails, invoices, inventory — to save time and reduce human error.",
    startingFrom: "Save time: automate what matters",
    delay: "2–5 weeks",
    problem: {
      title: "Your teams waste hours on manual tasks",
      text: "Copy-pasting between Excel and WhatsApp, forgotten follow-ups, scattered data: manual processes slow your business and create costly mistakes.",
    },
    solution: {
      title: "Reliable workflows between your apps",
      text: "We map your processes, design custom automations (n8n, Make, Zapier, or API), and set up alerts so information flows without manual intervention.",
    },
    deliverables: [
      "Map of your current processes",
      "Automated workflows (1 to 5 scenarios)",
      "API, webhook, and CRM integrations",
      "Data sync between tools",
      "Email, Slack, or WhatsApp notifications",
      "Flow monitoring dashboard",
      "Automation documentation",
      "Training to maintain scenarios",
    ],
    process: [
      {
        step: "01",
        title: "Process diagnosis",
        description: "Identify repetitive tasks, tools in use, and potential gains.",
      },
      {
        step: "02",
        title: "Flow design",
        description: "Workflow diagrams, checkpoints, and business rules to automate.",
      },
      {
        step: "03",
        title: "Build & testing",
        description: "Set up integrations, real-world testing, and fixes.",
      },
      {
        step: "04",
        title: "Deploy & train",
        description: "Production activation, documentation, and team training.",
      },
    ],
    idealFor: [
      "SMBs with CRM, billing, or e-commerce",
      "Sales teams handling many leads",
      "Companies that want fewer data-entry errors",
      "Organizations ready to connect existing tools",
    ],
    faq: [
      {
        question: "Which tools can you connect?",
        answer:
          "Google Sheets, Notion, HubSpot, Pipedrive, WooCommerce, Stripe, WhatsApp Business API, email, Slack, and most services with an API or connector.",
      },
      {
        question: "n8n, Make, or Zapier — which should I choose?",
        answer:
          "Zapier and Make suit standard needs. n8n (self-hosted) is ideal for more control, volume, or sensitive data. We recommend based on your context.",
      },
      {
        question: "What happens if a workflow fails?",
        answer:
          "We configure error alerts and fallback scenarios. Monitoring can be added through our maintenance offer.",
      },
      {
        question: "Can I evolve the automations later?",
        answer:
          "Yes. We deliver clear documentation and offer on-demand changes or a maintenance contract.",
      },
    ],
    relatedRealisationIds: ["startup-tech", "ong-humanitaire"],
  },
  {
    id: "devops",
    metaDescription:
      "DevOps: CI/CD pipelines, Docker, monitoring, and Infrastructure as Code. Ship faster and more securely. Free personalized quote.",
    heroDescription:
      "Industrialize your releases with CI/CD pipelines, containerization, and reliable monitoring — so you ship more often, with less stress.",
    startingFrom: "Reliable infrastructure, calm deployments",
    delay: "3–6 weeks",
    problem: {
      title: "Manual deployments mean risk and delay",
      text: "Stressful releases, inconsistent environments, no automated tests: your team wastes time and every release becomes a gamble.",
    },
    solution: {
      title: "A robust, repeatable DevOps chain",
      text: "We set up CI/CD pipelines, containerize your apps, automate tests, and configure monitoring and alerts so every deployment is predictable.",
    },
    deliverables: [
      "Audit of current setup (infra, deployments, tools)",
      "CI/CD pipeline (GitHub Actions, GitLab CI…)",
      "Docker containerization (Dockerfile, compose)",
      "Staging and production environments",
      "Automated tests integrated into the pipeline",
      "Monitoring, centralized logs, and alerts",
      "Runbook documentation and procedures",
      "Technical team training",
    ],
    process: [
      {
        step: "01",
        title: "Audit & architecture",
        description: "Analysis of your stack, current practices, and friction points.",
      },
      {
        step: "02",
        title: "CI/CD design",
        description: "Define pipelines, environments, and deployment strategy.",
      },
      {
        step: "03",
        title: "Implementation",
        description: "Docker setup, pipelines, tests, and monitoring.",
      },
      {
        step: "04",
        title: "Handover & run",
        description: "Documentation, team training, and first guided deployments.",
      },
    ],
    idealFor: [
      "Startups and growing product teams",
      "Projects with frequent releases",
      "Apps that need staging + production",
      "Companies that want fewer production incidents",
    ],
    faq: [
      {
        question: "Do you work with our existing codebase?",
        answer:
          "Yes. We adapt to your stack (Node.js, PHP, Python, etc.) and your current or future host.",
      },
      {
        question: "GitHub Actions or GitLab CI?",
        answer:
          "Both. We choose based on your Git forge and security constraints.",
      },
      {
        question: "Do you include security in the pipelines?",
        answer:
          "Yes: dependency analysis, basic scans, and secrets-management best practices are part of our approach.",
      },
      {
        question: "Do you offer ongoing support?",
        answer:
          "Yes, through our maintenance & SLA offer or ad hoc on-call engagements as needed.",
      },
    ],
    relatedRealisationIds: ["startup-tech", "immobilier-prestige"],
  },
  {
    id: "cloud",
    metaDescription:
      "Cloud services: AWS, GCP, Azure, Vercel migration, high availability, and cost optimization. Free personalized quote.",
    heroDescription:
      "Host and scale your applications in the cloud — secure migration, scalable architecture, and controlled costs.",
    startingFrom: "Cloud infrastructure that matches your ambition",
    delay: "2–6 weeks",
    problem: {
      title: "Rigid or costly infrastructure holds you back",
      text: "Single server with no redundancy, unpredictable cloud bills, trouble absorbing traffic spikes: your infrastructure no longer keeps up with business growth.",
    },
    solution: {
      title: "A cloud architecture built for your priorities",
      text: "We design, migrate, and optimize your infrastructure on AWS, Google Cloud, Azure, or Vercel — with backups, monitoring, and a recovery plan to ensure availability and performance.",
    },
    deliverables: [
      "Infrastructure audit and cost estimate",
      "Cloud architecture (diagram, sizing, zones)",
      "Planned migration with rollback",
      "High-availability setup (as needed)",
      "Automated backups and tested restore",
      "Cost optimization (reserved, scaling)",
      "Monitoring and alerts (uptime, resources)",
      "Documentation and skills transfer",
    ],
    process: [
      {
        step: "01",
        title: "Audit & scoping",
        description: "Inventory of apps, business constraints, budget, and availability goals.",
      },
      {
        step: "02",
        title: "Architecture",
        description: "Target infrastructure design, provider choice, and migration plan.",
      },
      {
        step: "03",
        title: "Migration",
        description: "Phased rollout, load testing, and controlled DNS cutover.",
      },
      {
        step: "04",
        title: "Optimize & run",
        description: "Cost tuning, active monitoring, and operational documentation.",
      },
    ],
    idealFor: [
      "Web apps with variable traffic",
      "Projects leaving shared hosting",
      "SaaS and platforms that need scalability",
      "Businesses focused on service continuity",
    ],
    faq: [
      {
        question: "Which cloud do you recommend?",
        answer:
          "Vercel for Next.js apps, AWS/GCP for complex projects, Azure for Microsoft environments. We recommend based on your stack and budget.",
      },
      {
        question: "Does migration cause downtime?",
        answer:
          "We plan to minimize interruption: DNS cutover, temporary dual-run, and a maintenance window agreed with you.",
      },
      {
        question: "How do you control cloud costs?",
        answer:
          "Budget alerts, right-sizing, reservations, and monthly review of unused resources are part of our approach.",
      },
      {
        question: "Do you manage backups?",
        answer:
          "Yes. Automated backups, configurable retention, and restore tests to reduce data-loss risk.",
      },
    ],
    relatedRealisationIds: ["immobilier-prestige", "ong-humanitaire"],
  },
  {
    id: "applications-mobiles",
    metaDescription:
      "iOS and Android mobile app development: React Native, Flutter, mobile-first UI/UX. Free personalized quote.",
    heroDescription:
      "Reach your customers on iOS and Android with a fast, intuitive app connected to your existing digital ecosystem.",
    startingFrom: "A mobile app that stays in your customers’ pocket",
    delay: "8–16 weeks",
    problem: {
      title: "A website alone is no longer enough to retain users",
      text: "Your customers live on mobile. Without a dedicated app, you miss push notifications, smooth journeys, and a place on their home screen.",
    },
    solution: {
      title: "A mobile app aligned with your business goals",
      text: "We design and build native or cross-platform apps (React Native, Flutter) with mobile-first UX, push notifications, and connection to your website or back office.",
    },
    deliverables: [
      "Functional scoping and mobile wireframes",
      "iOS and Android UI/UX design",
      "Cross-platform or native development",
      "Authentication and user area",
      "Push notifications",
      "API / website / back-office connection",
      "Testing on real devices",
      "App Store and Google Play submission",
    ],
    process: [
      {
        step: "01",
        title: "Scoping & UX",
        description: "Define MVP scope, user journeys, and interactive mockups.",
      },
      {
        step: "02",
        title: "UI design",
        description: "iOS/Android interfaces consistent with your visual identity.",
      },
      {
        step: "03",
        title: "Development",
        description: "Coding, API integration, unit tests, and device testing.",
      },
      {
        step: "04",
        title: "Publish & follow-up",
        description: "Store submission, Apple/Google review fixes, and post-launch support.",
      },
    ],
    idealFor: [
      "Services that need frequent mobile access",
      "Platforms with a client or member area",
      "Retailers wanting loyalty via notifications",
      "Digital projects that already have a back end",
    ],
    faq: [
      {
        question: "React Native or Flutter?",
        answer:
          "React Native if your ecosystem is JavaScript/TypeScript. Flutter for highly custom UIs or specific performance needs. We recommend after scoping.",
      },
      {
        question: "Do we need separate iOS and Android builds?",
        answer:
          "Not necessarily. Cross-platform gives one codebase for both stores, cutting cost and time for most projects.",
      },
      {
        question: "Do you handle store publication?",
        answer:
          "Yes. We support developer account setup, submission, and any Apple or Google feedback.",
      },
      {
        question: "Can the app connect to my existing website?",
        answer:
          "Yes. We connect the app to your API, CMS, or database through secure endpoints.",
      },
    ],
    relatedRealisationIds: ["clinique-sante", "boutique-mode"],
  },
  {
    id: "developpement-sur-mesure",
    metaDescription:
      "Custom development: SaaS, client portals, APIs, and dashboards. Web solutions tailored to your processes. Free personalized quote.",
    heroDescription:
      "When off-the-shelf tools fall short — we design web platforms, SaaS products, and business tools shaped around your processes and growth.",
    startingFrom: "Custom solutions calibrated for your business",
    delay: "6–16 weeks",
    problem: {
      title: "Generic tools cap your efficiency",
      text: "Excel, WhatsApp, and ill-fitting software: your unique business processes have no standard solution. Result — wasted time, fragmented data, and no way to scale.",
    },
    solution: {
      title: "A platform designed for how you work",
      text: "We analyze your workflows, design a scalable architecture, and build a custom web application — client portal, SaaS, intranet, or API — with dashboards and third-party integrations.",
    },
    deliverables: [
      "Scoping workshop and functional specifications",
      "Technical architecture and UX mockups",
      "Front-end and back-end development",
      "Authentication, roles, and permissions",
      "Documented REST or GraphQL APIs",
      "Dashboards and reporting",
      "Third-party integrations (payments, CRM, email…)",
      "Testing, deployment, and documentation",
    ],
    process: [
      {
        step: "01",
        title: "Discovery",
        description: "Deep understanding of your processes, business constraints, and measurable goals.",
      },
      {
        step: "02",
        title: "Design",
        description: "Specifications, wireframes, technical architecture, and sprint planning.",
      },
      {
        step: "03",
        title: "Agile development",
        description: "Incremental deliveries, regular demos, and course corrections along the way.",
      },
      {
        step: "04",
        title: "QA & go-live",
        description: "User testing, fixes, training, and secure deployment.",
      },
    ],
    idealFor: [
      "Companies with specific business processes",
      "SaaS or marketplace projects",
      "Client portals and intranets",
      "Organizations ready to invest for the long term",
    ],
    faq: [
      {
        question: "Where do we start a custom project?",
        answer:
          "With a scoping workshop (1–2 days) to define MVP scope, budget, and timeline. We can then proceed in phases.",
      },
      {
        question: "What tech stack do you use?",
        answer:
          "Primarily Next.js, TypeScript, PostgreSQL, and modern APIs. We adapt the stack to your existing constraints.",
      },
      {
        question: "Can the platform evolve after launch?",
        answer:
          "Yes. We design scalable architectures and offer maintenance, SLA, and development of new features.",
      },
      {
        question: "Who owns the code and data?",
        answer:
          "You own the delivered code and your data. We provide documentation and the required access.",
      },
    ],
    relatedRealisationIds: ["immobilier-prestige", "academy-elearning", "ong-humanitaire"],
  },
];

export function getServiceDetailEn(id: string): ServiceDetail | undefined {
  return serviceDetailsEn.find((d) => d.id === id);
}
