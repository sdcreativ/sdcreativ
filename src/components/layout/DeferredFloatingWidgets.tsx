"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const FloatingWidgets = dynamic(
  () => import("@/components/layout/FloatingWidgets").then((m) => m.FloatingWidgets),
  { ssr: false },
);

/**
 * Charge chat IA, 3CX, WhatsApp et scroll-to-top après idle ou première interaction
 * pour réduire le TBT au chargement initial (Lighthouse mobile).
 */
export function DeferredFloatingWidgets() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const mount = () => {
      if (!cancelled) setReady(true);
    };

    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((event) =>
      window.addEventListener(event, mount, { once: true, passive: true }),
    );

    let idleHandle: number | undefined;
    if (typeof requestIdleCallback !== "undefined") {
      idleHandle = requestIdleCallback(mount, { timeout: 3500 });
    } else {
      idleHandle = window.setTimeout(mount, 3500);
    }

    return () => {
      cancelled = true;
      events.forEach((event) => window.removeEventListener(event, mount));
      if (idleHandle !== undefined) {
        if (typeof cancelIdleCallback !== "undefined" && typeof idleHandle === "number") {
          cancelIdleCallback(idleHandle);
        } else {
          window.clearTimeout(idleHandle);
        }
      }
    };
  }, []);

  if (!ready) return null;
  return <FloatingWidgets />;
}
