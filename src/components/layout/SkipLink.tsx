"use client";

import { usePathname } from "next/navigation";
import { isActiveEnglishPath } from "@/i18n/routes";

export function SkipLink() {
  const pathname = usePathname() ?? "/";
  const label = isActiveEnglishPath(pathname)
    ? "Skip to main content"
    : "Aller au contenu principal";

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
    >
      {label}
    </a>
  );
}
