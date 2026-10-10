import { X } from "lucide-react";
import type { PublicSitePopup } from "@/lib/site-popups-types";
import { cn } from "@/lib/utils";

/**
 * Couleurs exactes du logo SD CREATIV (relevées sur public/images/logo.png) :
 * bleu #0175BA (nuance #0471B3), rouge #E23944, noir #010101, gris #595959.
 * Écrites en clair dans les classes (Tailwind ne génère que les valeurs littérales).
 */
export const POPUP_INPUT_CLASS =
  "w-full rounded-xl border border-[#C9D3E3] bg-white px-4 py-3 text-base text-[#010101] focus:border-[#0175BA] focus:outline-none focus:ring-2 focus:ring-[#0175BA]/20";
export const POPUP_LABEL_CLASS = "mb-1.5 block text-base text-[#010101]";

type Props = {
  popup: Pick<PublicSitePopup, "eyebrow" | "title" | "body" | "offerLabel" | "variant">;
  /** Titre / texte remplacés après inscription (écran de succès). */
  heading?: { title: string; body: string };
  onClose?: () => void;
  closeLabel?: string;
  titleId?: string;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Habillage visuel d'un popup — partagé entre le site public et l'aperçu admin.
 * En-tête plein aux couleurs du logo, filet de contraste, corps clair avec le formulaire.
 * Sans état ni hook : utilisable côté serveur comme côté client.
 */
export function SitePopupCard({ popup, heading, onClose, closeLabel = "Fermer", titleId, className, children }: Props) {
  const accent = popup.variant === "accent";
  const title = heading?.title ?? popup.title;
  const body = heading?.body ?? popup.body;

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl bg-[#F5F6F8] shadow-2xl", className)}>
      <div
        className={cn(
          "relative overflow-hidden px-7 pb-7 pt-8 text-white sm:px-8",
          accent ? "bg-[#E23944]" : "bg-gradient-to-br from-[#0175BA] to-[#0471B3]",
        )}
      >
        {/* Halo décoratif en bas à droite, comme la maquette. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -bottom-24 -right-20 h-44 w-44 rounded-full",
            accent ? "bg-white/10" : "bg-[#1C8AD0]/60",
          )}
        />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-2 text-white/80 hover:bg-white/15 hover:text-white"
            aria-label={closeLabel}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        )}
        <div className="relative">
          {popup.eyebrow && !heading && (
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-white/95">{popup.eyebrow}</p>
          )}
          <h2 id={titleId} className="mt-3 pr-6 text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-[2.3rem]">
            {title}
          </h2>
          {!heading && popup.offerLabel && (
            <p className="mt-4 text-lg font-bold leading-snug sm:text-xl">{popup.offerLabel}</p>
          )}
        </div>
      </div>
      <div aria-hidden className={cn("h-1.5", accent ? "bg-[#0175BA]" : "bg-[#E23944]")} />
      <div className="px-7 py-6 sm:px-8">
        {body && <p className="text-base leading-relaxed text-[#010101]">{body}</p>}
        {children && <div className={body ? "mt-5" : undefined}>{children}</div>}
      </div>
    </div>
  );
}
