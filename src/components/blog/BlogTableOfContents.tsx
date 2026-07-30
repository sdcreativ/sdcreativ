"use client";

import { useEffect, useState } from "react";
import { List } from "lucide-react";
import type { BlogHeading } from "@/lib/blog-toc";
import { cn } from "@/lib/utils";

type Props = {
  headings: BlogHeading[];
  locale?: "fr" | "en";
  className?: string;
};

export function BlogTableOfContents({
  headings,
  locale = "fr",
  className,
}: Props) {
  const isEn = locale === "en";
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "");
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    if (headings.length === 0) return;

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -65% 0px",
        threshold: [0, 0.25, 0.5, 1],
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  const title = isEn ? "Contents" : "Sommaire";

  const list = (
    <nav aria-label={title}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-text">
        {title}
      </p>
      <ol className="space-y-2.5 border-l border-gray/70">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              onClick={() => setOpenMobile(false)}
              className={cn(
                "block border-l-2 -ml-px py-0.5 text-sm leading-snug transition-colors",
                heading.level === 3 ? "pl-5" : "pl-3",
                activeId === heading.id
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-gray-text hover:text-foreground",
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );

  return (
    <>
      {/* Mobile : panneau repliable */}
      <div className={cn("lg:hidden", className)}>
        <button
          type="button"
          onClick={() => setOpenMobile((v) => !v)}
          className="flex w-full items-center justify-between gap-3 border border-gray/60 px-4 py-3 text-left text-sm font-semibold text-foreground"
          aria-expanded={openMobile}
        >
          <span className="inline-flex items-center gap-2">
            <List className="h-4 w-4 text-primary" aria-hidden />
            {title}
          </span>
          <span className="text-xs font-normal text-gray-text">
            {openMobile
              ? isEn
                ? "Hide"
                : "Masquer"
              : isEn
                ? "Show"
                : "Afficher"}
          </span>
        </button>
        {openMobile && <div className="mt-3 border border-t-0 border-gray/60 px-4 py-4">{list}</div>}
      </div>

      {/* Desktop : sticky */}
      <aside
        className={cn(
          "hidden lg:block",
          "sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2",
          className,
        )}
      >
        {list}
      </aside>
    </>
  );
}
