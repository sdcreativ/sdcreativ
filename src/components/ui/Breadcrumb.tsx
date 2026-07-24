"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { isEnglishPath } from "@/i18n/routes";
import { isEnglishLocaleEnabled } from "@/i18n/config";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

type BreadcrumbProps = {
  items: Crumb[];
  className?: string;
  variant?: "dark" | "light";
  /** Override auto locale detection from the pathname. */
  locale?: "fr" | "en";
};

export function Breadcrumb({
  items,
  className,
  variant = "dark",
  locale,
}: BreadcrumbProps) {
  const pathname = usePathname() ?? "/";
  const isEn =
    isEnglishLocaleEnabled() &&
    (locale === "en" || (locale == null && isEnglishPath(pathname)));
  const isLight = variant === "light";

  return (
    <nav
      aria-label={isEn ? "Breadcrumb" : "Fil d'Ariane"}
      className={cn("text-sm", className)}
    >
      <ol
        className={cn(
          "flex flex-wrap items-center gap-1.5",
          isLight ? "text-gray-text" : "text-white/60",
        )}
      >
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight
                className={cn("h-3.5 w-3.5 shrink-0", isLight ? "text-gray" : "")}
                aria-hidden
              />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "transition-colors",
                  isLight ? "hover:text-primary" : "hover:text-white",
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={isLight ? "font-medium text-foreground" : "text-white/90"}
                aria-current="page"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
