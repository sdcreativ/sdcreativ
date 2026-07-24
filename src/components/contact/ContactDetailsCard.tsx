"use client";

import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSitePublic, useWhatsappUrl } from "@/components/site/SitePublicProvider";
import { contactPageEn } from "@/i18n/public-en";

type Props = {
  locale?: "fr" | "en";
};

/**
 * Coordonnées contact — lit le provider layout (mêmes settings CRM que le footer),
 * pour éviter un payload ISR de page /contact figé sur les placeholders.
 */
export function ContactDetailsCard({ locale = "fr" }: Props) {
  const { contact } = useSitePublic();
  const waUrl = useWhatsappUrl(
    locale === "en"
      ? "Hello SD CREATIV, I would like to get in touch."
      : undefined,
  );
  const isEn = locale === "en";

  return (
    <div className="overflow-hidden rounded-3xl bg-dark shadow-xl">
      <div className="h-1 bg-gradient-to-r from-primary to-primary-light" />
      <div className="p-8">
        <h3 className="text-lg font-bold text-white">
          {isEn ? contactPageEn.coordsTitle : "Coordonnées"}
        </h3>
        <p className="mt-1 text-sm text-white/50">
          {isEn
            ? contactPageEn.coordsSubtitle
            : "Nous sommes disponibles du lundi au vendredi."}
        </p>
        <ul className="mt-6 space-y-4">
          <li>
            <a
              href={contact.phoneHref}
              className="group flex items-center gap-4 rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary-light transition-colors group-hover:bg-primary group-hover:text-white">
                <Phone className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-sm text-white/80 group-hover:text-white">
                {contact.phone}
              </span>
            </a>
          </li>
          <li>
            <a
              href={`mailto:${contact.email}`}
              className="group flex items-center gap-4 rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary-light transition-colors group-hover:bg-primary group-hover:text-white">
                <Mail className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-sm text-white/80 group-hover:text-white">
                {contact.email}
              </span>
            </a>
          </li>
          <li className="flex items-center gap-4 rounded-xl bg-white/5 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary-light">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm text-white/80">{contact.address}</span>
          </li>
          <li className="flex items-center gap-4 rounded-xl bg-white/5 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary-light">
              <Clock className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm text-white/80">{contact.hours}</span>
          </li>
        </ul>
        <Button
          href={waUrl}
          external
          variant="outline"
          className="mt-6 w-full justify-center border-white/20 hover:bg-white/5"
        >
          <MessageCircle className="h-4 w-4 text-green-400" aria-hidden />
          {isEn ? contactPageEn.whatsapp : "Parler sur WhatsApp"}
        </Button>
      </div>
    </div>
  );
}
