"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isActiveEnglishPath } from "@/i18n/routes";

/** Synchronise `document.documentElement.lang` avec la route (/en → en, sinon fr). */
export function HtmlLangSync() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    document.documentElement.lang = isActiveEnglishPath(pathname) ? "en" : "fr";
  }, [pathname]);

  return null;
}
