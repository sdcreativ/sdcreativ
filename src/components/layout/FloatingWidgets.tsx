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

export function FloatingWidgets() {
  const pathname = usePathname() ?? "";
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/espace-client") ||
    pathname.startsWith("/presentation")
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

  return (
    <>
      {threeCxActive ? <ThreeCxWidget pathname={pathname} now={now} /> : null}
      {showAi ? <ChatWidget mode={aiMode} locale={chatLocale} /> : null}
      <ScrollToTop dodgeThreeCx={threeCxActive} />
      <WhatsAppFloat dodgeThreeCx={threeCxActive} />
    </>
  );
}
