import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

/** Statique : évite un fetch CMS sur le chemin critique Lighthouse. */
export const dynamic = "force-static";
export const revalidate = 86400;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — ${SITE.tagline}`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0a1628",
    theme_color: "#0072b5",
    orientation: "portrait-primary",
    lang: "fr",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
