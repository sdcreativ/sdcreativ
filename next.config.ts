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
  output: "standalone",
  // Évite le tracing partiel (ex. browsers.json manquant) qui casse le PDF en prod.
  serverExternalPackages: ["playwright-core"],
  // Migrations SQL + Playwright (PDF) — aussi copiés explicitement dans le Dockerfile.
  outputFileTracingIncludes: {
    "/*": [
      "./migrations/**/*",
      "./node_modules/playwright-core/**/*",
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
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: !process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
});
