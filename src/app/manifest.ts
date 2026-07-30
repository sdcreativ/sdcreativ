import type { MetadataRoute } from "next";
import { SITE, LOGO } from "@/lib/constants";
import { getSiteIconHref } from "@/lib/site-favicon";

export const revalidate = 300;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const icon = await getSiteIconHref().catch(() => LOGO.src);

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
      {
        src: icon,
        sizes: "any",
        type: icon.toLowerCase().includes(".svg") ? "image/svg+xml" : "image/png",
        purpose: "any",
      },
      {
        src: icon,
        sizes: "any",
        type: icon.toLowerCase().includes(".svg") ? "image/svg+xml" : "image/png",
        purpose: "maskable",
      },
    ],
  };
}
