"use client";

import { useEffect, useState } from "react";

/** Barre de progression de lecture (fixe sous le header). */
export function BlogReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const article = document.querySelector("[data-blog-article]");
      if (!article) {
        setProgress(0);
        return;
      }
      const rect = article.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) {
        setProgress(100);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress((scrolled / total) * 100);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-60 h-0.5 bg-transparent"
      aria-hidden
    >
      <div
        className="h-full origin-left bg-primary transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
