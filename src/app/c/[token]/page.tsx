import type { ReactNode } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, Mail, Phone } from "lucide-react";
import { BusinessCardActions } from "@/components/cards/BusinessCardActions";
import { isBusinessCardsEnabled } from "@/lib/business-cards-flag";
import { getBusinessCardByToken, getPublicBusinessCard } from "@/lib/business-cards";
import {
  businessCardPublicPath,
  businessCardPublicUrl,
  isPublicCardToken,
  whatsappUrl,
} from "@/lib/business-card-public";
import { LOGO, LOGO_FOOTER, SITE } from "@/lib/constants";
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
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
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
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <Image src={LOGO.src} alt="SD CREATIV" width={160} height={90} className="h-12 w-auto" />
        <h1 className="mt-8 text-2xl font-bold text-foreground">Cette carte professionnelle n&apos;est plus active.</h1>
        <p className="mt-3 text-sm text-gray-text">SD CREATIV</p>
        <Link href="/" className="mt-6 text-sm font-semibold text-primary hover:underline">
          sdcreativ.com
        </Link>
      </main>
    );
  }

  const wa = card.whatsapp ? whatsappUrl(card.whatsapp) : null;
  const photo = card.photoUrl ? resolveImageDisplayUrl(card.photoUrl) : "";

  return (
    <main className="mx-auto max-w-lg px-4 py-10 md:py-16">
      <article className="overflow-hidden rounded-3xl border border-gray/40 bg-white shadow-sm">
        <div className="bg-foreground px-6 py-5 text-white">
          <Image src={LOGO_FOOTER.src} alt="SD CREATIV" width={LOGO_FOOTER.width} height={LOGO_FOOTER.height} className="h-8 w-auto" />
        </div>
        <div className="px-6 pb-8 pt-6">
          {photo ? (
            <Image
              src={photo}
              alt=""
              width={112}
              height={112}
              unoptimized
              className="mx-auto h-28 w-28 rounded-full object-cover ring-4 ring-primary-light"
            />
          ) : null}
          <h1 className="mt-4 text-center text-2xl font-bold text-foreground">{card.name}</h1>
          {card.jobTitle ? (
            <p className="mt-1 text-center text-sm font-semibold text-primary">{card.jobTitle}</p>
          ) : null}
          {card.department ? (
            <p className="mt-1 text-center text-sm text-gray-text">{card.department}</p>
          ) : null}
          <p className="mt-1 text-center text-sm font-medium text-foreground">{card.company}</p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {card.phone ? (
              <ActionLink href={`tel:${card.phone}`} label="Appeler">
                <Phone className="h-4 w-4" aria-hidden />
              </ActionLink>
            ) : null}
            {wa ? (
              <ActionLink href={wa} label="WhatsApp">
                <Phone className="h-4 w-4" aria-hidden />
              </ActionLink>
            ) : null}
            {card.email ? (
              <ActionLink href={`mailto:${card.email}`} label="Email">
                <Mail className="h-4 w-4" aria-hidden />
              </ActionLink>
            ) : null}
            {card.website ? (
              <ActionLink href={card.website} label="Site web">
                <Globe className="h-4 w-4" aria-hidden />
              </ActionLink>
            ) : null}
            {card.linkedin ? <ActionLink href={card.linkedin} label="LinkedIn"><span aria-hidden>in</span></ActionLink> : null}
            {card.github ? <ActionLink href={card.github} label="GitHub"><span aria-hidden>gh</span></ActionLink> : null}
          </div>

          <div className="mt-4 flex justify-center">
            <a
              href={`/api/cards/${encodeURIComponent(token)}/vcard`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary/30 bg-primary-light px-4 py-2.5 text-sm font-semibold text-primary"
            >
              Ajouter aux contacts
            </a>
          </div>

          {card.bio ? <p className="mt-6 text-sm leading-relaxed text-gray-text">{card.bio}</p> : null}

          {card.skills.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {card.skills.map((skill) => (
                <li key={skill} className="rounded-full bg-gray-light px-3 py-1 text-xs font-medium text-foreground">
                  {skill}
                </li>
              ))}
            </ul>
          ) : null}

          {card.services.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-gray-text">
              {card.services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          ) : null}

          {card.location || card.languages ? (
            <p className="mt-4 text-xs text-gray-text">
              {[card.location, card.languages].filter(Boolean).join(" · ")}
            </p>
          ) : null}

          {(card.instagram || card.twitter) && (
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-primary">
              {card.instagram ? (
                <a href={card.instagram} target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
              ) : null}
              {card.twitter ? (
                <a href={card.twitter} target="_blank" rel="noopener noreferrer">
                  X
                </a>
              ) : null}
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-3">
            <BusinessCardActions token={token} name={card.name} url={url} />
            <Image
              src={`/api/cards/${encodeURIComponent(token)}/qr`}
              alt={`QR code de la carte de ${card.name}`}
              width={180}
              height={180}
              unoptimized
              className="h-44 w-44"
            />
            <Link href="/" className="text-sm font-semibold text-primary hover:underline">
              sdcreativ.com
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
