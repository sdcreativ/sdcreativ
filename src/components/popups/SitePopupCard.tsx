import { Gift, X } from "lucide-react";
import type { PublicSitePopup } from "@/lib/site-popups-types";
import { cn } from "@/lib/utils";

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
 * Sans état ni hook : utilisable côté serveur comme côté client.
 */
export function SitePopupCard({ popup, heading, onClose, closeLabel = "Fermer", titleId, className, children }: Props) {
  const accent = popup.variant === "accent";
  const tone = accent ? "text-accent-dark" : "text-primary";
  const title = heading?.title ?? popup.title;
  const body = heading?.body ?? popup.body;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-gray/60 border-t-4 bg-white shadow-xl",
        accent ? "border-t-accent" : "border-t-primary",
        className,
      )}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-2 text-gray-text hover:bg-gray-light hover:text-foreground"
          aria-label={closeLabel}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      )}
      <div className="p-6 sm:p-7">
        {popup.eyebrow && !heading && (
          <p className={cn("text-xs font-semibold uppercase tracking-widest", tone)}>{popup.eyebrow}</p>
        )}
        <h2 id={titleId} className="mt-1 pr-8 text-xl font-extrabold leading-snug text-foreground sm:text-2xl">
          {title}
        </h2>
        {!heading && (
          <p
            className={cn(
              "mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
              accent ? "bg-accent/5" : "bg-primary-light",
              tone,
            )}
          >
            <Gift className="h-4 w-4 shrink-0" aria-hidden />
            {popup.offerLabel}
          </p>
        )}
        {body && <p className="mt-3 text-sm leading-relaxed text-gray-text">{body}</p>}
        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  );
}
