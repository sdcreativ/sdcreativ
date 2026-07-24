"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isEnglishLocaleEnabled } from "@/i18n/config";
import { getAlternatePath, isEnglishPath } from "@/i18n/routes";
import { localeSwitcher } from "@/i18n/en-content";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function LocaleSwitcher({ className }: Props) {
  const pathname = usePathname() ?? "/";
  const isEn = isEnglishPath(pathname);

  if (!isEnglishLocaleEnabled()) return null;

  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-[#e0e0e0] bg-white p-0.5 text-xs font-bold shadow-sm",
        className,
      )}
      role="group"
      aria-label="Choisir la langue"
    >
      <Link
        href={getAlternatePath(pathname, "fr")}
        className={cn(
          "rounded-full px-2.5 py-1.5 transition-colors",
          !isEn ? "bg-primary text-white" : "text-gray-text hover:text-foreground",
        )}
        aria-label={localeSwitcher.fr.ariaLabel}
        aria-current={!isEn ? "page" : undefined}
      >
        {localeSwitcher.fr.label}
      </Link>
      <Link
        href={getAlternatePath(pathname, "en")}
        className={cn(
          "rounded-full px-2.5 py-1.5 transition-colors",
          isEn ? "bg-primary text-white" : "text-gray-text hover:text-foreground",
        )}
        aria-label={localeSwitcher.en.ariaLabel}
        aria-current={isEn ? "page" : undefined}
      >
        {localeSwitcher.en.label}
      </Link>
    </div>
  );
}
