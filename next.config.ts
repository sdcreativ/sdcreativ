import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  output: "standalone",
  // Évite le tracing partiel (ex. browsers.json manquant) qui casse le PDF en prod.
  serverExternalPackages: ["playwright-core", "sharp"],
  // Migrations SQL + Playwright (PDF) — aussi copiés explicitement dans le Dockerfile.
  outputFileTracingIncludes: {
    "/*": [
      "./migrations/**/*",
      "./node_modules/playwright-core/**/*",
      "./node_modules/sharp/**/*",
      "./node_modules/@img/**/*",
      // Logos PDF (document-logo lit public/images sans tracer tout le repo)
      "./public/images/logo.png",
      "./public/images/logo_sd.svg",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    // Les navigateurs demandent encore /favicon.ico (ex-fichier Next par défaut).
    return [{ source: "/favicon.ico", destination: "/icon" }];
  },
  async redirects() {
    return [
      {
        source: "/blog/:slug",
        has: [{ type: "query", key: "preview" }],
        destination: "/blog/apercu/:slug",
        permanent: false,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: !process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
});
