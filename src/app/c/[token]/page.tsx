import type { ReactNode } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { BusinessCardActions } from "@/components/cards/BusinessCardActions";
import { InstagramIcon, LinkedInIcon } from "@/components/ui/SocialIcons";
import { Logo } from "@/components/ui/Logo";
import { isBusinessCardsEnabled } from "@/lib/business-cards-flag";
import { getBusinessCardByToken, getPublicBusinessCard } from "@/lib/business-cards";
import {
  businessCardPublicPath,
  businessCardPublicUrl,
  isPublicCardToken,
  whatsappUrl,
} from "@/lib/business-card-public";
import { SITE } from "@/lib/constants";
import { resolveImageDisplayUrl } from "@/lib/image-url";
import { createMetadata } from "@/lib/metadata";

type Params = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  if (!isBusinessCardsEnabled()) return createMetadata({ title: "Carte", description: SITE.name, noIndex: true });
  const { token } = await params;
  if (!isPublicCardToken(token)) {
    return createMetadata({ title: "Carte", description: SITE.name, noIndex: true });
  }
  const record = await getBusinessCardByToken(token).catch(() => null);
  if (!record) return createMetadata({ title: "Carte", description: SITE.name, noIndex: true });
  const card = getPublicBusinessCard(record);
  if (card.status !== "active") {
    return createMetadata({
      title: "Carte professionnelle",
      description: "Cette carte professionnelle n'est plus active.",
      path: businessCardPublicPath(token),
      noIndex: true,
    });
  }
  const title = card.jobTitle ? `${card.name} — ${card.jobTitle}` : card.name;
  const description = [card.jobTitle, card.department, card.company].filter(Boolean).join(" · ");
  return createMetadata({
    title,
    description: description || `${card.name} · ${SITE.name}`,
    path: businessCardPublicPath(token),
    noIndex: !card.indexable,
    image: card.photoUrl,
  });
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.73.5.5 5.73.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "SD";
}

function ActionLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      aria-label={label}
      className="flex min-h-16 min-w-[4.75rem] flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2 text-[11px] font-semibold tracking-wide text-foreground transition hover:bg-primary-light"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
        {children}
      </span>
      {label}
    </a>
  );
}

export default async function PublicBusinessCardPage({ params }: Params) {
  if (!isBusinessCardsEnabled()) notFound();
  const { token } = await params;
  if (!isPublicCardToken(token)) notFound();

  const record = await getBusinessCardByToken(token);
  if (!record) notFound();
  const card = getPublicBusinessCard(record);
  const url = businessCardPublicUrl(token);

  if (card.status !== "active") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f3f6fa] px-5 py-16">
        <div className="w-full max-w-sm rounded-[28px] bg-white px-8 py-12 text-center shadow-[0_24px_80px_-36px_rgba(15,23,42,0.45)]">
          <Logo href={null} variant="mark" size="card" />
          <h1 className="mt-8 text-xl font-semibold tracking-tight text-foreground">
            Cette carte professionnelle n&apos;est plus active.
          </h1>
          <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-primary">
            sdcreativ.com
          </Link>
        </div>
      </div>
    );
  }

  const wa = card.whatsapp ? whatsappUrl(card.whatsapp) : null;
  const photo = card.photoUrl ? resolveImageDisplayUrl(card.photoUrl) : "";
  const actions = [
    card.phone ? { href: `tel:${card.phone}`, label: "Appeler", icon: <Phone className="h-5 w-5" aria-hidden /> } : null,
    wa ? { href: wa, label: "WhatsApp", icon: <Phone className="h-5 w-5" aria-hidden /> } : null,
    card.email ? { href: `mailto:${card.email}`, label: "Email", icon: <Mail className="h-5 w-5" aria-hidden /> } : null,
    card.website ? { href: card.website, label: "Site", icon: <Globe className="h-5 w-5" aria-hidden /> } : null,
    card.linkedin ? { href: card.linkedin, label: "LinkedIn", icon: <LinkedInIcon className="h-5 w-5" /> } : null,
    card.github ? { href: card.github, label: "GitHub", icon: <GithubIcon className="h-5 w-5" /> } : null,
    card.instagram ? { href: card.instagram, label: "Instagram", icon: <InstagramIcon className="h-5 w-5" /> } : null,
  ].filter((item) => item !== null);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#eef3f8] px-4 py-8 sm:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(0,114,181,0.16),transparent_68%)]" />
      <article className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-[32px] bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)]">
        <div className="h-1.5 bg-primary" />
        <div className="px-6 pb-8 pt-7 sm:px-8">
          <Logo href={null} variant="mark" size="card" />

          <div className="mt-7 flex justify-center">
            {photo ? (
              // img : /api/media et les portraits d'équipe ne passent pas par l'optimiseur.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt=""
                width={128}
                height={128}
                className="h-32 w-32 rounded-full object-cover shadow-[0_12px_30px_-16px_rgba(0,90,145,0.8)] ring-4 ring-white"
              />
            ) : (
              <span className="flex h-32 w-32 items-center justify-center rounded-full bg-primary-light text-2xl font-semibold tracking-wide text-primary ring-4 ring-white">
                {initials(card.name)}
              </span>
            )}
          </div>

          <h1 className="mt-5 text-center text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground">
            {card.name}
          </h1>
          {card.jobTitle ? (
            <p className="mt-1.5 text-center text-sm font-semibold text-primary">{card.jobTitle}</p>
          ) : null}
          {card.department ? (
            <p className="mt-1 text-center text-sm text-gray-text">{card.department}</p>
          ) : null}
          <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-text">
            {card.company}
          </p>

          {actions.length > 0 ? (
            <div className="mt-7 grid grid-cols-3 gap-1">
              {actions.map((action) => (
                <ActionLink key={action.label} href={action.href} label={action.label}>
                  {action.icon}
                </ActionLink>
              ))}
            </div>
          ) : null}

          <a
            href={`/cards/${encodeURIComponent(token)}/contact.vcf`}
            className="mt-4 flex min-h-12 items-center justify-center rounded-2xl bg-foreground text-sm font-semibold text-white transition hover:bg-primary"
          >
            Ajouter aux contacts
          </a>

          {card.bio ? (
            <p className="mt-7 text-center text-sm leading-relaxed text-gray-text">{card.bio}</p>
          ) : null}

          {card.skills.length > 0 ? (
            <ul className="mt-5 flex flex-wrap justify-center gap-2">
              {card.skills.map((skill) => (
                <li key={skill} className="rounded-full bg-[#f3f6fa] px-3 py-1 text-xs font-medium text-foreground">
                  {skill}
                </li>
              ))}
            </ul>
          ) : null}

          {card.services.length > 0 ? (
            <ul className="mt-4 space-y-1 text-center text-sm text-gray-text">
              {card.services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          ) : null}

          {card.location || card.languages ? (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-gray-text">
              {card.location ? <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
              {[card.location, card.languages].filter(Boolean).join(" · ")}
            </p>
          ) : null}

          {card.twitter ? (
            <p className="mt-3 text-center">
              <a href={card.twitter} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary">
                X / Twitter
              </a>
            </p>
          ) : null}

          <div className="mt-8 rounded-3xl bg-[#f7f9fc] px-4 py-5">
            <BusinessCardActions token={token} name={card.name} url={url} />
            <Image
              src={`/api/cards/${encodeURIComponent(token)}/qr`}
              alt={`QR code de la carte de ${card.name}`}
              width={168}
              height={168}
              unoptimized
              className="mx-auto mt-4 h-40 w-40 rounded-2xl bg-white p-2"
            />
          </div>

          <Link href="/" className="mt-5 block text-center text-xs font-semibold tracking-wide text-primary">
            sdcreativ.com
          </Link>
        </div>
      </article>
    </div>
  );
}
