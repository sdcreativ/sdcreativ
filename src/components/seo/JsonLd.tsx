import { SITE, LOGO } from "@/lib/constants";
import type { ServiceDetail } from "@/content/service-details";
import { isEnglishLocaleEnabled } from "@/i18n/config";
import { getGoogleMapsUrl, getGooglePlaceReviews } from "@/lib/google-places-reviews";
import type { ResolvedFormationCategory } from "@/lib/formations-resolver";
import { resolveImageDisplayUrl } from "@/lib/image-url";
import { getSitePublicSettings } from "@/lib/site-public-settings";

function toAbsoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE.url}${path}`;
}

export async function OrganizationJsonLd() {
  const { contact, social } = await getSitePublicSettings();
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    logo: `${SITE.url}${LOGO.src}`,
    email: contact.email,
    telephone: contact.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Abidjan",
      addressCountry: "CI",
    },
    sameAs: [social.facebook, social.linkedin, social.instagram, social.youtube].filter(
      Boolean,
    ),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export async function LocalBusinessJsonLd() {
  const [{ contact, social }, googleReviews] = await Promise.all([
    getSitePublicSettings(),
    getGooglePlaceReviews(),
  ]);
  const mapsUrl = getGoogleMapsUrl(contact.address);

  const aggregateRating =
    googleReviews.source === "google" &&
    googleReviews.rating > 0 &&
    googleReviews.reviewCount > 0
      ? {
          "@type": "AggregateRating" as const,
          ratingValue: googleReviews.rating,
          reviewCount: googleReviews.reviewCount,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  const reviews =
    googleReviews.source === "google" && googleReviews.reviews.length > 0
      ? googleReviews.reviews.slice(0, 5).map((review) => ({
          "@type": "Review" as const,
          author: {
            "@type": "Person" as const,
            name: review.author,
          },
          datePublished: review.date,
          reviewBody: review.text,
          reviewRating: {
            "@type": "Rating" as const,
            ratingValue: review.rating,
            bestRating: 5,
            worstRating: 1,
          },
        }))
      : undefined;

  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE.url}/#localbusiness`,
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    image: `${SITE.url}${LOGO.src}`,
    telephone: contact.phone,
    email: contact.email,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address,
      addressLocality: "Abidjan",
      addressRegion: "Lagunes",
      addressCountry: "CI",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 5.3599517,
      longitude: -3.9866389,
    },
    areaServed: [
      { "@type": "City", name: "Abidjan" },
      { "@type": "Country", name: "Côte d'Ivoire" },
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "18:00",
      },
    ],
    sameAs: [social.facebook, social.linkedin, social.instagram, social.youtube].filter(
      Boolean,
    ),
    ...(mapsUrl ? { hasMap: mapsUrl } : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(reviews?.length ? { review: reviews } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebSiteJsonLd() {
  const enEnabled = isEnglishLocaleEnabled();
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: enEnabled ? ["fr-CI", "en"] : "fr-CI",
    publisher: { "@id": `${SITE.url}/#localbusiness` },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

type BreadcrumbItem = { label: string; href?: string };

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE.url}${item.href}` } : {}),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

type FaqJsonLdItem = { question: string; answer: string };

type ServiceJsonLdProps = {
  service: { title: string; description: string; image?: string };
  detail: Pick<ServiceDetail, "id" | "metaDescription" | "heroDescription" | "deliverables">;
  path: string;
  locale?: "fr" | "en";
};

export function ServiceJsonLd({ service, detail, path, locale = "fr" }: ServiceJsonLdProps) {
  const url = `${SITE.url}${path}`;
  const imageSrc = service.image ? resolveImageDisplayUrl(service.image) : undefined;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: detail.metaDescription || detail.heroDescription || service.description,
    url,
    ...(imageSrc ? { image: toAbsoluteUrl(imageSrc) } : {}),
    provider: {
      "@type": "Organization",
      "@id": `${SITE.url}/#localbusiness`,
      name: SITE.name,
      url: SITE.url,
    },
    areaServed: [
      { "@type": "City", name: "Abidjan" },
      { "@type": "Country", name: locale === "en" ? "Ivory Coast" : "Côte d'Ivoire" },
    ],
    serviceType: service.title,
    ...(detail.deliverables.length
      ? { category: detail.deliverables.slice(0, 5).join(", ") }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

type CourseJsonLdProps = {
  category: ResolvedFormationCategory;
  path: string;
};

export function CourseJsonLd({ category, path }: CourseJsonLdProps) {
  const { detail } = category;
  const url = `${SITE.url}${path}`;
  const imageSrc = category.image ? resolveImageDisplayUrl(category.image) : undefined;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: category.title,
    description: detail.metaDescription || detail.heroDescription || category.description,
    url,
    ...(imageSrc ? { image: toAbsoluteUrl(imageSrc) } : {}),
    provider: {
      "@type": "Organization",
      "@id": `${SITE.url}/#localbusiness`,
      name: SITE.name,
      url: SITE.url,
    },
    educationalLevel: detail.level,
    timeRequired: detail.durationSummary,
    courseMode: detail.format,
    ...(detail.outcomes.length ? { teaches: detail.outcomes } : {}),
    ...(category.courses.length
      ? {
          hasCourseInstance: category.courses.map((course) => ({
            "@type": "CourseInstance",
            name: course.title,
            ...(course.duration ? { duration: course.duration } : {}),
          })),
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FaqJsonLd({ items }: { items: FaqJsonLdItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
