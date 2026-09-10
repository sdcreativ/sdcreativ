"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  KODIVA_BANNER_STORAGE_KEY,
  KODIVA_REGISTER_URL,
  isKodivaBannerHiddenPath,
} from "@/lib/kodiva-banner";
import { isActiveEnglishPath } from "@/i18n/routes";

function setBannerOffset(hidden: boolean) {
  if (hidden) {
    document.documentElement.setAttribute("data-kodiva-banner", "off");
  } else {
    document.documentElement.removeAttribute("data-kodiva-banner");
  }
}

export function KodivaBanner() {
  const pathname = usePathname() ?? "/";
  const isEn = isActiveEnglishPath(pathname);
  const hiddenByRoute = isKodivaBannerHiddenPath(pathname);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(KODIVA_BANNER_STORAGE_KEY) === "1";
    if (dismissed) setOpen(false);
    setBannerOffset(dismissed || hiddenByRoute);
  }, [hiddenByRoute]);

  if (hiddenByRoute || !open) return null;

  const closeLabel = isEn ? "Dismiss banner" : "Fermer le bandeau";

  const dismiss = () => {
    sessionStorage.setItem(KODIVA_BANNER_STORAGE_KEY, "1");
    setOpen(false);
    setBannerOffset(true);
  };

  return (
    <div className="kodiva-banner relative bg-dark text-white">
      <p className="flex h-9 items-center justify-center gap-x-1.5 px-10 text-center text-xs font-medium tracking-wide sm:text-[13px]">
        <span className="font-semibold">KODIVA</span>
        <span className="text-white/40" aria-hidden>
          ·
        </span>
        <span className="hidden text-white/80 sm:inline">
          {isEn
            ? "SD CREATIV’s AI agent platform"
            : "la plateforme d’agents IA de SD CREATIV"}
        </span>
        <span className="hidden text-white/40 sm:inline" aria-hidden>
          ·
        </span>
        <a
          href={KODIVA_REGISTER_URL}
          className="font-semibold text-[#8fd0f0] underline-offset-2 hover:text-white hover:underline"
          data-track-cta="kodiva_banner_register"
        >
          {isEn ? "Create a workspace" : "Créer un espace"}
        </a>
      </p>
      <button
        type="button"
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        onClick={dismiss}
        aria-label={closeLabel}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
