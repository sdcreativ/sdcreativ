"use client";

import { useEffect, useRef, useState } from "react";
import { OPEN_THREECX_CHAT_EVENT } from "@/lib/threecx/ai-coexistence";
import {
  getThreeCxWidgetConfig,
  shouldMountThreeCxWidget,
  THREECX_CALLUS_SCRIPT_ID,
  THREECX_CALLUS_SCRIPT_URL,
  type ThreeCxWidgetConfig,
} from "@/lib/threecx/widget-config";

type Props = {
  pathname: string;
  /** Horodatage pour Option A (rafraîchi par le parent). */
  now: Date;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace React.JSX {
    interface IntrinsicElements {
      "call-us-selector": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "phonesystem-url"?: string;
          party?: string;
        },
        HTMLElement
      >;
    }
  }
}

/**
 * Charge le snippet officiel 3CX (`call-us-selector` + callus.js)
 * après idle / première interaction (perf).
 */
export function ThreeCxWidget({ pathname, now }: Props) {
  const config = getThreeCxWidgetConfig();
  const shouldMount = shouldMountThreeCxWidget({ pathname, date: now, config });
  const [loadScript, setLoadScript] = useState(false);
  const armedRef = useRef(false);

  useEffect(() => {
    if (!shouldMount) {
      setLoadScript(false);
      armedRef.current = false;
      return;
    }
    if (armedRef.current) return;
    armedRef.current = true;

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const arm = () => setLoadScript(true);

    const onInteract = () => {
      arm();
      cleanupInteract();
    };

    const cleanupInteract = () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("scroll", onInteract);
    };

    window.addEventListener("pointerdown", onInteract, { once: true, passive: true });
    window.addEventListener("keydown", onInteract, { once: true });
    window.addEventListener("scroll", onInteract, { once: true, passive: true });

    const ric = window.requestIdleCallback;
    if (typeof ric === "function") {
      idleId = ric(() => arm(), { timeout: 4000 });
    } else {
      timeoutId = setTimeout(arm, 2500);
    }

    return () => {
      cleanupInteract();
      if (idleId !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [shouldMount]);

  useEffect(() => {
    if (!shouldMount || !loadScript || !config) return;
    ensureCallusScript();
  }, [shouldMount, loadScript, config]);

  /** Handoff depuis l’Assistant IA (Phase 7). */
  useEffect(() => {
    if (!shouldMount) return;
    function onOpenRequest() {
      setLoadScript(true);
      window.setTimeout(() => {
        document.querySelector<HTMLElement>("[data-threecx-widget], call-us-selector")?.click();
      }, 400);
    }
    window.addEventListener(OPEN_THREECX_CHAT_EVENT, onOpenRequest);
    return () => window.removeEventListener(OPEN_THREECX_CHAT_EVENT, onOpenRequest);
  }, [shouldMount]);

  if (!shouldMount || !loadScript || !config) return null;

  return <ThreeCxCallUsSelector config={config} />;
}

function ThreeCxCallUsSelector({ config }: { config: ThreeCxWidgetConfig }) {
  return (
    <call-us-selector
      data-threecx-widget="true"
      phonesystem-url={config.phonesystemUrl}
      party={config.party}
    />
  );
}

function ensureCallusScript(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(THREECX_CALLUS_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = THREECX_CALLUS_SCRIPT_ID;
  script.src = THREECX_CALLUS_SCRIPT_URL;
  script.defer = true;
  script.charset = "utf-8";
  document.body.appendChild(script);
}
