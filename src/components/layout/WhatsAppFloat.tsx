"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useWhatsappUrl } from "@/components/site/SitePublicProvider";
import { cn } from "@/lib/utils";

type Props = {
  /** Option A : 3CX occupe le bas-droit → WhatsApp passe à gauche, au-dessus du chat IA. */
  dodgeThreeCx?: boolean;
};

export function WhatsAppFloat({ dodgeThreeCx = false }: Props) {
  const waUrl = useWhatsappUrl();
  return (
    <Link
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter SD CREATIV sur WhatsApp"
      data-track-cta="float_whatsapp"
      className={cn(
        "fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]",
        dodgeThreeCx
          ? "bottom-40 left-4 md:bottom-28 md:left-8"
          : "bottom-24 right-6 md:bottom-8 md:right-8",
      )}
    >
      <MessageCircle className="h-7 w-7" aria-hidden />
    </Link>
  );
}
