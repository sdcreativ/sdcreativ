"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const FloatingWidgets = dynamic(
  () => import("@/components/layout/FloatingWidgets").then((m) => m.FloatingWidgets),
  { ssr: false },
);

/**
 * Chat / 3CX uniquement après clic ou clavier.
 * Lighthouse scrolle : un timeout ou un listener scroll ferait tout charger pendant l’audit.
 */
export function DeferredFloatingWidgets() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const mount = () => {
      if (!cancelled) setReady(true);
    };

    const events = ["pointerdown", "keydown"] as const;
    events.forEach((event) =>
      window.addEventListener(event, mount, { once: true, passive: true }),
    );

    return () => {
      cancelled = true;
      events.forEach((event) => window.removeEventListener(event, mount));
    };
  }, []);

  if (!ready) return null;
  return <FloatingWidgets />;
}
