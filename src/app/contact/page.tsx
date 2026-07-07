import Image from "next/image";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactMap } from "@/components/contact/ContactMap";
import { BookAppointment } from "@/components/booking/BookAppointment";
import { Button } from "@/components/ui/Button";
import { getSitePublicSettings } from "@/lib/site-public-settings";
import { buildWhatsappUrl } from "@/lib/site-public-resolver";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Contact",
  description:
    "Contactez SD CREATIV pour un devis gratuit. Agence web à Abidjan — sites vitrines, e-commerce, refonte et SEO local.",
  path: "/contact",
});

const benefits = [
  "Devis gratuit et sans engagement",
  "Estimation instantanée en FCFA",
  "Réponse sous 24 à 48 heures",
  "Accompagnement de A à Z",
] as const;

type Props = {
  searchParams: Promise<{ service?: string }>;
};

export default async function ContactPage({ searchParams }: Props) {
  const { service } = await searchParams;
  const { contact } = await getSitePublicSettings();
  const waUrl = buildWhatsappUrl(contact);
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Parlons de"
        highlight="votre projet"
        description="Remplissez le formulaire ou contactez-nous directement. Nous vous répondons sous 24 à 48 heures."
        backgroundImage="/images/contact/contact-hero-bg.png"
        backgroundAlt="Équipe SD CREATIV au travail dans un bureau moderne"
      />

      <section className="relative overflow-hidden bg-gray-light py-20 md:py-28">
        <div className="pointer-events-none absolute -left-32 top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-20 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />

        <div className="container relative mx-auto grid gap-10 px-4 lg:grid-cols-5 lg:gap-12 md:px-6 lg:px-8">
          <div className="lg:col-span-3">
            <ContactForm defaultService={service ?? ""} />
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-28 space-y-6">
              <BookAppointment variant="embed" />
              <div className="overflow-hidden rounded-3xl bg-dark shadow-xl">
                <div className="h-1 bg-gradient-to-r from-primary to-primary-light" />
                <div className="p-8">
                  <h3 className="text-lg font-bold text-white">Coordonnées</h3>
                  <p className="mt-1 text-sm text-white/50">
                    Nous sommes disponibles du lundi au vendredi.
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
                    Parler sur WhatsApp
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-gray/60 bg-white shadow-sm">
                <div className="grid sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="p-8">
                    <h3 className="font-bold text-foreground">Pourquoi nous contacter ?</h3>
                    <ul className="mt-5 space-y-3">
                      {benefits.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm text-gray-text">
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                            aria-hidden
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="relative hidden h-full w-36 shrink-0 sm:block">
                    <Image
                      src="/images/contact/contact-support.png"
                      alt=""
                      fill
                      className="object-contain object-bottom p-4"
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carte Google Maps */}
        <div className="container relative mx-auto mt-16 px-4 md:px-6 lg:px-8">
          <ContactMap />
        </div>
      </section>
    </>
  );
}
