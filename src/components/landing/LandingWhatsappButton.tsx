"use client";

import { MessageCircle } from "lucide-react";
import { useWhatsappUrl } from "@/components/site/SitePublicProvider";
import { cn } from "@/lib/utils";

const AUDIT_MESSAGE = "Bonjour SD CREATIV, je souhaite un audit gratuit de mon site.";

/**
 * Bouton WhatsApp de la page publicité. La référence de campagne est ajoutée au message
 * et le clic compté au moment du clic (AttributionTracker).
 */
export function LandingWhatsappButton({
  label = "Écrire sur WhatsApp",
  trackId,
  className,
}: {
  label?: string;
  trackId: string;
  className?: string;
}) {
  const href = useWhatsappUrl(AUDIT_MESSAGE);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-track-cta={trackId}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-[#25D366]/25 transition-colors hover:bg-[#1EBE5A]",
        className,
      )}
    >
      <MessageCircle className="h-5 w-5" aria-hidden />
      {label}
    </a>
  );
}
