"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { isActiveEnglishPath } from "@/i18n/routes";

const SCROLL_THRESHOLD = 400;

type Props = {
  /** Option A : 3CX bas-droit → bouton remonter au-dessus de la pile droite. */
  dodgeThreeCx?: boolean;
  /** Nari à droite : au-dessus de son bouton, quelle que soit sa taille (variable --kady-size). */
  aboveChatSize?: number;
};

export function ScrollToTop({ dodgeThreeCx = false, aboveChatSize }: Props) {
  const pathname = usePathname() ?? "";
  const isEn = isActiveEnglishPath(pathname);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const label = isEn ? "Back to top" : "Retour en haut";

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={label}
      title={label}
      style={aboveChatSize ? ({ "--kady-size": `${aboveChatSize}px` } as CSSProperties) : undefined}
      className={cn(
        "fixed z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-black/20 transition-all duration-300 hover:scale-105 hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        dodgeThreeCx
          ? "right-6 bottom-[7.5rem] md:right-8 md:bottom-[6.5rem]"
          : aboveChatSize
            ? "right-4 bottom-[calc(6.75rem_+_var(--kady-size))] md:right-8 md:bottom-[calc(2.75rem_+_var(--kady-size))]"
            : "right-6 bottom-[10.25rem] md:right-8 md:bottom-[6.25rem]",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      )}
    >
      <ArrowUp className="h-5 w-5" aria-hidden />
    </button>
  );
}
