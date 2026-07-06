"use client";

import { useEffect } from "react";

type Props = {
  slug: string;
};

function sendTrack(slug: string, type: "view" | "click") {
  void fetch("/api/blog/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, type }),
    keepalive: true,
  }).catch(() => undefined);
}

export function BlogPostTracker({ slug }: Props) {
  useEffect(() => {
    const storageKey = `blog-view-${slug}`;
    if (!sessionStorage.getItem(storageKey)) {
      sessionStorage.setItem(storageKey, "1");
      sendTrack(slug, "view");
    }

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-track-cta]")) {
        sendTrack(slug, "click");
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [slug]);

  return null;
}
