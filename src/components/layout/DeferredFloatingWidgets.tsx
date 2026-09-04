"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

const FloatingWidgets = dynamic(
  () => import("@/components/layout/FloatingWidgets").then((m) => m.FloatingWidgets),
  { ssr: false },
);

function isPublicChromePath(pathname: string): boolean {
  return (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/espace-client") &&
    !pathname.startsWith("/presentation")
  );
}

/**
 * Bouton « haut de page » tout de suite.
 * Chat / WhatsApp / 3CX après idle (~2 s) ou première interaction — sans attendre un clic.
 */
export function DeferredFloatingWidgets() {
  const pathname = usePathname() ?? "";
  const [ready, setReady] = useState(false);
  const publicChrome = isPublicChromePath(pathname);

  useEffect(() => {
    let cancelled = false;
    const mount = () => {
      if (!cancelled) setReady(true);
    };

    const events = ["pointerdown", "keydown"] as const;
    events.forEach((event) =>
      window.addEventListener(event, mount, { once: true, passive: true }),
    );

    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(mount, { timeout: 2000 });
    } else {
      timeoutHandle = window.setTimeout(mount, 2000);
    }

    return () => {
      cancelled = true;
      events.forEach((event) => window.removeEventListener(event, mount));
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
    };
  }, []);

  if (!publicChrome) return null;

  return (
    <>
      {!ready ? <ScrollToTop /> : null}
      {ready ? <FloatingWidgets /> : null}
    </>
  );
}
