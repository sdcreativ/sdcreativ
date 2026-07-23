"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isEnglishPath } from "@/i18n/routes";

/** Keeps <html lang> in sync when navigating between FR and EN. */
export function DocumentLang() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    document.documentElement.lang = isEnglishPath(pathname) ? "en" : "fr";
  }, [pathname]);

  return null;
}
