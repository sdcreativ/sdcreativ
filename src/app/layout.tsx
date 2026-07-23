import { Poppins } from "next/font/google";
import { HeaderGate } from "@/components/layout/HeaderGate";
import { FooterGate } from "@/components/layout/FooterGate";
import { FloatingWidgets } from "@/components/layout/FloatingWidgets";
import { SkipLink } from "@/components/layout/SkipLink";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { AppProviders } from "@/components/layout/AppProviders";
import { Analytics } from "@/components/analytics/Analytics";
import { DocumentLang } from "@/components/i18n/DocumentLang";
import { OrganizationJsonLd, LocalBusinessJsonLd, WebSiteJsonLd } from "@/components/seo/JsonLd";
import { SITE } from "@/lib/constants";
import { getSitePublicSettings } from "@/lib/site-public-settings";
import { createMetadata } from "@/lib/metadata";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata = createMetadata({
  title: SITE.name,
  description: SITE.description,
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sitePublic = await getSitePublicSettings();

  return (
    <html lang="fr" className={`${poppins.variable} scroll-smooth`} suppressHydrationWarning>
      <head>
        <OrganizationJsonLd />
        <LocalBusinessJsonLd />
        <WebSiteJsonLd />
      </head>
      <body
        className="min-h-screen bg-background font-sans text-foreground antialiased"
        suppressHydrationWarning
      >
        <AppProviders sitePublic={sitePublic}>
          <DocumentLang />
          <SkipLink />
          <HeaderGate />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <FooterGate sitePublic={sitePublic} />
          <FloatingWidgets />
          <CookieConsent />
          <Analytics />
        </AppProviders>
      </body>
    </html>
  );
}
