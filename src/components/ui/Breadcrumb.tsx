import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

type BreadcrumbProps = {
  items: Crumb[];
  className?: string;
  variant?: "dark" | "light";
};

export function Breadcrumb({ items, className, variant = "dark" }: BreadcrumbProps) {
  const isLight = variant === "light";

  return (
    <nav aria-label="Fil d'Ariane" className={cn("text-sm", className)}>
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
