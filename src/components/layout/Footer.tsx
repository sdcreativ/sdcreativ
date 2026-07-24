"use client";

import Link from "next/link";
import { Phone, Mail, MapPin, Clock, LayoutDashboard } from "lucide-react";
import {
  FacebookIcon,
  LinkedInIcon,
  InstagramIcon,
  YouTubeIcon,
} from "@/components/ui/SocialIcons";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { NavGlowLink } from "@/components/ui/NavGlowLink";
import { NewsletterSignup } from "@/components/forms/NewsletterSignup";
import { buildWhatsappUrl } from "@/lib/site-public-resolver";
import type { ResolvedSitePublic } from "@/lib/site-public-types";
import {
  footerQuickLinks,
  footerServices,
  footerSeoLinks,
  footerSeoLinksEn,
  legalLinks,
} from "@/content/navigation";
import { enFooter } from "@/i18n/en-content";

type FooterProps = {
  sitePublic: ResolvedSitePublic;
  locale?: "fr" | "en";
};

export function Footer({ sitePublic, locale = "fr" }: FooterProps) {
  const { contact, social, companyName, tagline } = sitePublic;
  const waUrl = buildWhatsappUrl(contact);
  const year = new Date().getFullYear();
  const isEn = locale === "en";

  const socialIcons = [
    { href: social.facebook, icon: FacebookIcon, label: "Facebook" },
    { href: social.linkedin, icon: LinkedInIcon, label: "LinkedIn" },
    { href: social.instagram, icon: InstagramIcon, label: "Instagram" },
    { href: social.youtube, icon: YouTubeIcon, label: "YouTube" },
  ] as const;

  const quickLinks = isEn ? enFooter.links : footerQuickLinks;
  const serviceLinks = isEn ? enFooter.serviceLinks : footerServices;
  const legal = isEn ? enFooter.legal : legalLinks;

  return (
    <footer className="bg-dark-footer text-white">
      <div className="border-b border-white/10 bg-dark py-14">
        <div className="container mx-auto px-4 text-center md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold uppercase leading-snug md:text-3xl lg:text-4xl">
            {isEn ? (
              <>
                {enFooter.ctaTitle}
                <br />
                <span className="text-primary-light">{enFooter.ctaHighlight}</span>
              </>
            ) : (
              <>
                Prêt à donner une nouvelle dimension
                <br />
                <span className="text-primary-light">à votre présence digitale ?</span>
              </>
            )}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            {isEn
              ? enFooter.ctaDescription
              : "Discutons de votre projet et construisons ensemble votre succès."}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              href={isEn ? "/en/devis" : "/devis"}
              size="lg"
              data-track-cta="footer_devis"
            >
              {isEn ? enFooter.ctaQuote : "Demander un devis"}
            </Button>
            <Button
              href={waUrl}
              external
              variant="outline"
              size="lg"
              data-track-cta="footer_whatsapp"
            >
              {isEn ? enFooter.ctaWhatsapp : "Parler sur WhatsApp"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-2 md:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <Logo variant="footer" />
          <p className="mt-4 text-sm leading-relaxed text-white/60">{tagline}</p>
          <NewsletterSignup locale={isEn ? "en" : "fr"} />
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
              <LayoutDashboard className="h-4 w-4 text-primary-light" aria-hidden />
              {isEn ? enFooter.clientPortalTitle : "Espace client"}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white/50">
              {isEn
                ? enFooter.clientPortalDescription
                : "Déjà client ? Accédez à vos factures, documents et suivi de projet."}
            </p>
            <Button
              href="/espace-client"
              size="sm"
              variant="ghost"
              className="mt-3 w-full justify-center border border-white/15 text-white hover:bg-white/10"
              data-track-cta="footer_espace_client"
            >
              {isEn ? enFooter.clientPortalCta : "Se connecter au portail"}
            </Button>
          </div>
          <div className="mt-6 flex gap-3">
            {socialIcons.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white/70 transition-colors hover:bg-primary hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/90">
            {isEn ? enFooter.quickLinks : "Liens rapides"}
          </h3>
          <ul className="space-y-2.5">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <NavGlowLink href={link.href} variant="footer">
                  {link.label}
                </NavGlowLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/90">
            {isEn ? enFooter.services : "Nos services"}
          </h3>
          <ul className="space-y-2.5">
            {serviceLinks.map((link) => (
              <li key={link.href}>
                <NavGlowLink href={link.href} variant="footer">
                  {link.label}
                </NavGlowLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/90">
            {isEn ? enFooter.contact : "Contactez-nous"}
          </h3>
          <ul className="space-y-4">
            <li>
              <a
                href={contact.phoneHref}
                className="flex items-start gap-3 text-sm text-white/60 transition-colors hover:text-white"
              >
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
                {contact.phone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${contact.email}`}
                className="flex items-start gap-3 text-sm text-white/60 transition-colors hover:text-white"
              >
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
                {contact.email}
              </a>
            </li>
            <li className="flex items-start gap-3 text-sm text-white/60">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
              {contact.address}
            </li>
            <li className="flex items-start gap-3 text-sm text-white/60">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
              {contact.hours}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-white/50 md:flex-row md:px-6 lg:px-8">
          <p>
            © {year} {companyName}. {isEn ? enFooter.rights : "Tous droits réservés."}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {(isEn ? footerSeoLinksEn : footerSeoLinks).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-glow-link nav-glow-link--footer transition-colors hover:text-white"
                data-track-cta={
                  link.href.includes("audit") || link.href.includes("free-audit")
                    ? "footer_seo_audit"
                    : link.href.includes("rendez-vous") || link.href.includes("/book")
                      ? "footer_seo_book"
                      : "footer_seo_link"
                }
              >
                <span className="nav-glow-link__inner">{link.label}</span>
              </Link>
            ))}
            {legal.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
