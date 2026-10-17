"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { ThreeCxWidget } from "@/components/chat/ThreeCxWidget";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { resolveAiCommsMode } from "@/lib/threecx/ai-coexistence";
import {
  getThreeCxWidgetConfig,
  shouldMountThreeCxWidget,
  shouldShowAiAssistant,
} from "@/lib/threecx/widget-config";
import { isActiveEnglishPath } from "@/i18n/routes";
import type { KadyAppearance } from "@/lib/kady-appearance";

export function FloatingWidgets({ kadyAppearance }: { kadyAppearance?: KadyAppearance }) {
  const pathname = usePathname() ?? "";
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/espace-client") ||
    pathname.startsWith("/presentation") ||
    // Page publicité : ses propres boutons WhatsApp, pas de chat ni de bouton flottant.
    pathname.startsWith("/offre/")
  ) {
    return null;
  }

  const config = getThreeCxWidgetConfig();
  const threeCxActive = shouldMountThreeCxWidget({
    pathname,
    date: now,
    config,
  });
  const showAi = shouldShowAiAssistant({
    date: now,
    threeCxActive,
  });
  const aiMode = resolveAiCommsMode({ date: now, threeCxActive });
  const chatLocale = isActiveEnglishPath(pathname) ? "en" : "fr";

  // Kady à droite seulement si le Live Chat 3CX n'occupe pas déjà ce coin ; WhatsApp passe alors à gauche.
  const kadyRight = showAi && kadyAppearance?.position === "right" && !threeCxActive;

  return (
    <>
      {threeCxActive ? <ThreeCxWidget pathname={pathname} now={now} /> : null}
      {showAi ? (
        <ChatWidget
          mode={aiMode}
          locale={chatLocale}
          appearance={kadyAppearance}
          side={kadyRight ? "right" : "left"}
        />
      ) : null}
      <ScrollToTop dodgeThreeCx={threeCxActive} aboveChatSize={kadyRight ? kadyAppearance?.launcherSize : undefined} />
      <WhatsAppFloat dodgeThreeCx={threeCxActive} swapWithChat={kadyRight} />
    </>
  );
}
