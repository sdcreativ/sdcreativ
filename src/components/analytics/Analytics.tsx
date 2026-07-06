"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { ANALYTICS } from "@/lib/constants";
import { getCookieConsent } from "@/components/layout/CookieConsent";

export function Analytics() {
  const [enabled, setEnabled] = useState(false);
  const gaId = ANALYTICS.gaId;

  useEffect(() => {
    const sync = () => setEnabled(getCookieConsent() === "accepted");
    sync();
    window.addEventListener("cookie-consent-change", sync);
    return () => window.removeEventListener("cookie-consent-change", sync);
  }, []);

  if (!gaId || !enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
