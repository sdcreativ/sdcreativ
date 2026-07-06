"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isEnglishPath } from "@/i18n/routes";

/** Synchronise `document.documentElement.lang` avec la route (/en → en, sinon fr). */
export function HtmlLangSync() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    document.documentElement.lang = isEnglishPath(pathname) ? "en" : "fr";
  }, [pathname]);

  return null;
}
