import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { SitePageHero } from "@/components/ui/SitePageHero";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactMap } from "@/components/contact/ContactMap";
import { ContactDetailsCard } from "@/components/contact/ContactDetailsCard";
import { BookAppointment } from "@/components/booking/BookAppointment";
import { createMetadata } from "@/lib/metadata";

/** Toujours frais : évite un ISR /contact figé sur les placeholders de build. */
export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Contact",
  description:
    "Écrivez à SD CREATIV : questions, support et suivi de projet. Agence web à Abidjan — réponse sous 24 à 48 h.",
  path: "/contact",
});

const benefits = [
  "Réponse sous 24 à 48 heures",
  "Équipe disponible du lundi au vendredi",
  "Support, questions et suivi de projet",
  "WhatsApp pour un échange rapide",
] as const;

export default function ContactPage() {
  return (
    <>
      <SitePageHero pageKey="contact" />

      <section className="relative overflow-hidden bg-gray-light py-20 md:py-28">
        <div className="pointer-events-none absolute -left-32 top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-20 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />

        <div className="container relative mx-auto grid gap-10 px-4 lg:grid-cols-5 lg:gap-12 md:px-6 lg:px-8">
          <div className="lg:col-span-3">
            <ContactForm />
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-28 space-y-6">
              <BookAppointment variant="card" />
              <ContactDetailsCard />

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

        <div className="container relative mx-auto mt-16 px-4 md:px-6 lg:px-8">
          <ContactMap />
        </div>
      </section>
    </>
  );
}
