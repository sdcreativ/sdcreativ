"use client";

import Link from "next/link";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
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
import { useSitePublic, useWhatsappUrl } from "@/components/site/SitePublicProvider";
import { SITE } from "@/lib/constants";
import { footerQuickLinks, footerServices, footerSeoLinks, legalLinks } from "@/content/navigation";

export function Footer() {
  const { contact, social } = useSitePublic();
  const waUrl = useWhatsappUrl();
  const year = new Date().getFullYear();

  const socialIcons = [
    { href: social.facebook, icon: FacebookIcon, label: "Facebook" },
    { href: social.linkedin, icon: LinkedInIcon, label: "LinkedIn" },
    { href: social.instagram, icon: InstagramIcon, label: "Instagram" },
    { href: social.youtube, icon: YouTubeIcon, label: "YouTube" },
  ] as const;

  return (
    <footer className="bg-dark-footer text-white">
      <div className="border-b border-white/10 bg-dark py-14">
        <div className="container mx-auto px-4 text-center md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold uppercase leading-snug md:text-3xl lg:text-4xl">
            Prêt à donner une nouvelle dimension
            <br />
            <span className="text-primary-light">à votre présence digitale ?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Discutons de votre projet et construisons ensemble votre succès.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/devis" size="lg">
              Demander un devis
            </Button>
            <Button href={waUrl} external variant="outline" size="lg">
              Parler sur WhatsApp
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-2 md:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <Logo variant="footer" />
          <p className="mt-4 text-sm leading-relaxed text-white/60">{SITE.tagline}</p>
          <NewsletterSignup />
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
            Liens rapides
          </h3>
          <ul className="space-y-2.5">
            {footerQuickLinks.map((link) => (
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
            Nos services
          </h3>
          <ul className="space-y-2.5">
            {footerServices.map((link) => (
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
            Contactez-nous
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
          <p>© {year} {SITE.name}. Tous droits réservés.</p>
          <div className="flex flex-wrap justify-center gap-4">
            {footerSeoLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-glow-link nav-glow-link--footer transition-colors hover:text-white"
              >
                <span className="nav-glow-link__inner">{link.label}</span>
              </Link>
            ))}
            {legalLinks.map((link) => (
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
