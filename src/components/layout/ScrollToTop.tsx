"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD = 400;

type Props = {
  /** Option A : 3CX bas-droit → bouton remonter au-dessus de la pile droite. */
  dodgeThreeCx?: boolean;
};

export function ScrollToTop({ dodgeThreeCx = false }: Props) {
  const pathname = usePathname() ?? "";
  const isEn = pathname.startsWith("/en");
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
      className={cn(
        "fixed z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-black/20 transition-all duration-300 hover:scale-105 hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        dodgeThreeCx
          ? "right-6 bottom-[7.5rem] md:right-8 md:bottom-[6.5rem]"
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
