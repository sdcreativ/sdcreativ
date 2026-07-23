import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/espace-client/",
        "/espace-equipe/",
        "/espace-prestataire/",
        "/presentation/",
        "/promo/",
        "/verifier/",
        "/offline",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
