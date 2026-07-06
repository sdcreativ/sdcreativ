import { Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BOOKING } from "@/lib/constants";
import { cn } from "@/lib/utils";

type BookAppointmentProps = {
  className?: string;
  variant?: "card" | "inline" | "embed";
};

export function BookAppointment({ className, variant = "card" }: BookAppointmentProps) {
  if (!BOOKING.url && !BOOKING.embedUrl) {
    return null;
  }

  if (variant === "embed") {
    const embedSrc = BOOKING.embedUrl || (BOOKING.url ? `${BOOKING.url}?embed=true` : "");
    if (!embedSrc) return null;

    return (
      <div className={cn("overflow-hidden rounded-3xl border border-gray/60 bg-white shadow-sm", className)}>
        <div className="border-b border-gray/60 bg-primary-light/50 px-6 py-4">
          <h3 className="flex items-center gap-2 font-bold text-foreground">
            <Calendar className="h-5 w-5 text-primary" aria-hidden />
            {BOOKING.label}
          </h3>
          <p className="mt-1 text-sm text-gray-text">
            Choisissez un créneau disponible — confirmation immédiate par email.
          </p>
        </div>
        <iframe
          src={embedSrc}
          title={BOOKING.label}
          className="h-[580px] w-full border-0"
          loading="lazy"
        />
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <Button href={BOOKING.url} external size="lg" className={className}>
        <Calendar className="h-4 w-4" aria-hidden />
        {BOOKING.label}
        <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-gray/60 bg-white shadow-sm",
        className,
      )}
    >
      <div className="h-1 bg-gradient-to-r from-primary to-primary-light" />
      <div className="p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light">
          <Calendar className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <h3 className="mt-4 text-lg font-bold text-foreground">{BOOKING.label}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-text">
          Échangez directement avec notre équipe pour clarifier votre projet, sans
          attendre une réponse par email.
        </p>
        <Button href={BOOKING.url} external className="mt-6 w-full justify-center">
          Choisir un créneau
          <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
