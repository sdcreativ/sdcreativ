import { BookAppointment } from "@/components/booking/BookAppointment";
import { createMetadata } from "@/lib/metadata";
import { isBookingConfigured } from "@/lib/booking";
import { BOOKING } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

export const metadata = createMetadata({
  title: "Prendre rendez-vous",
  description:
    "Réservez un appel de 30 minutes avec SD CREATIV — calendrier en ligne, confirmation immédiate.",
  path: "/rendez-vous",
});

export default function RendezVousPage() {
  const configured = isBookingConfigured(BOOKING.url, BOOKING.embedUrl);

  return (
    <main className="relative min-h-[80vh] overflow-hidden bg-gray-light">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,114,181,0.10),_transparent_55%)]" />
      <div className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-20 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />

      <div className="container relative mx-auto px-4 pb-20 pt-28 md:px-6 md:pb-28 md:pt-32 lg:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            SD CREATIV
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-[2.75rem]">
            Réservez votre appel
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-text md:text-lg">
            Choisissez un créneau de 30 minutes. Échange simple, sans engagement —
            pour clarifier votre projet web ou digital.
          </p>
        </header>

        <div className="mx-auto mt-10 max-w-5xl md:mt-14">
          {configured ? (
            <BookAppointment variant="embed" />
          ) : (
            <div className="rounded-3xl border border-gray/50 bg-white p-10 text-center shadow-sm">
              <p className="text-gray-text">
                La prise de rendez-vous en ligne n’est pas encore configurée.
              </p>
              <div className="mt-6">
                <Button href="/contact">Nous écrire</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
