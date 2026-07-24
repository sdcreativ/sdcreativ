import type { BlogPost } from "@/content/blog";

/** Articles blog EN (mêmes slugs que FR pour hreflang). */
export const blogPostsEn: BlogPost[] = [
  {
    slug: "pourquoi-un-site-web-est-indispensable-pour-votre-pme",
    title: "Why a website is essential for your SME",
    excerpt:
      "Discover how a professional website builds credibility and opens new business opportunities.",
    category: "Digital strategy",
    date: "2026-05-15",
    readTime: "5 min",
    content: [
      "In a world where first impressions happen online, a professional website is no longer optional — it is essential for any SME that wants to stay competitive.",
      "A well-designed site builds trust, presents your services 24/7 and turns visitors into qualified leads. It is your permanent storefront, available from any device.",
      "At SD CREATIV, we help Ivorian entrepreneurs create websites tailored to their budget and growth goals.",
    ],
  },
  {
    slug: "seo-local-comment-etre-visible-sur-google",
    title: "Local SEO: how to rank on Google in Abidjan",
    excerpt:
      "Best practices to appear in local searches and attract customers near you.",
    category: "SEO",
    date: "2026-04-22",
    readTime: "6 min",
    content: [
      "Local SEO is essential for businesses targeting nearby customers. Optimizing your Google Business Profile, structuring your site and publishing local content are powerful levers.",
      "A site optimized for local SEO combines solid technical foundations, geo-targeted keywords and a consistent presence in local directories.",
      "We build these practices into every SD CREATIV project from day one to maximize your visibility.",
    ],
  },
  {
    slug: "5-signes-que-votre-site-a-besoin-dune-refonte",
    title: "5 signs your website needs a redesign",
    excerpt:
      "Outdated design, slow load times, poor mobile experience… Spot the signals that it is time to modernize.",
    category: "Website redesign",
    date: "2026-03-10",
    readTime: "4 min",
    content: [
      "An aging website hurts your brand and conversions. If your site takes more than 3 seconds to load, is not mobile-friendly or no longer reflects your activity, a redesign is needed.",
      "A redesign is the opportunity to rethink UX, improve performance and add new features.",
      "SD CREATIV offers a free diagnostic to assess your site and define a tailored modernization plan.",
    ],
  },
  {
    slug: "comment-choisir-agence-web-abidjan",
    title: "How to choose a web agency in Abidjan",
    excerpt:
      "Key criteria to pick the right digital partner in Côte d'Ivoire: portfolio, transparent quotes, local support and delivery times.",
    category: "Advice",
    date: "2026-06-01",
    readTime: "6 min",
    content: [
      "Choosing a web agency in Abidjan is a strategic decision. Beyond price, check the local portfolio, understanding of the Ivorian market (Mobile Money, WhatsApp) and post-launch support quality.",
      "Always ask for a detailed free custom quote, delivery timelines and included guarantees. A serious agency offers a free audit and stays transparent on scope.",
      "SD CREATIV supports Ivorian SMEs with clear proposals, an online quote configurator and a team based in Abidjan.",
    ],
  },
  {
    slug: "e-commerce-mobile-money-cote-ivoire",
    title: "E-commerce and Mobile Money in Côte d'Ivoire",
    excerpt:
      "Orange Money, Wave, MTN MoMo: integrate mobile payments into your online store to convert local customers.",
    category: "E-commerce",
    date: "2026-05-28",
    readTime: "7 min",
    content: [
      "E-commerce in Côte d'Ivoire runs on Mobile Money. Orange Money and Wave account for most online payments for local SMEs.",
      "A well-configured store combines product catalog, Mobile Money checkout, WhatsApp notifications and local delivery in Abidjan and beyond.",
      "SD CREATIV natively integrates these payment methods into your e-commerce projects, with admin training included.",
    ],
  },
  {
    slug: "agents-ia-pme-cote-ivoire",
    title: "AI agents for SMEs in Côte d'Ivoire",
    excerpt:
      "Chatbots, WhatsApp assistants and automation: how AI can help your SME save time.",
    category: "Artificial intelligence",
    date: "2026-06-15",
    readTime: "5 min",
    content: [
      "Artificial intelligence is no longer reserved for large companies. Ivorian SMEs can deploy AI agents to answer customers, qualify leads and automate repetitive tasks.",
      "A chatbot connected to WhatsApp or your website can handle most frequent questions 24/7 without hiring extra staff.",
      "SD CREATIV designs and deploys custom AI agents adapted to the local context — always with a free personalized quote.",
    ],
  },
];

export function getBlogPostEn(slug: string) {
  return blogPostsEn.find((post) => post.slug === slug);
}
