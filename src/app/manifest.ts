import type { MetadataRoute } from "next";
import { SITE, LOGO } from "@/lib/constants";

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
        src: LOGO.src,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: LOGO.src,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
