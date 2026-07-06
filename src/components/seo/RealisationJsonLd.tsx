import { SITE } from "@/lib/constants";
import type { Realisation } from "@/content/realisations";

export function RealisationJsonLd({ project }: { project: Realisation }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.description,
    creator: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    dateCreated: project.year,
    image: `${SITE.url}${project.image}`,
    about: project.sector,
    keywords: project.tags.join(", "),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
