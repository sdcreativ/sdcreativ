"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { isEnglishPath } from "@/i18n/routes";

const STORAGE_KEY = "sdcreativ-cookie-consent";

export type CookieConsent = "accepted" | "rejected" | null;

export function getCookieConsent(): CookieConsent {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "accepted" || value === "rejected") return value;
  return null;
}

export function setCookieConsent(value: "accepted" | "rejected") {
  localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: value }));
}

function subscribe(onChange: () => void) {
  window.addEventListener("cookie-consent-change", onChange);
  return () => window.removeEventListener("cookie-consent-change", onChange);
}

export function CookieConsent() {
  const pathname = usePathname() ?? "/";
  const isEn = isEnglishPath(pathname);
  const consent = useSyncExternalStore(
    subscribe,
    getCookieConsent,
    () => null,
  );
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-gray/60 bg-white p-4 shadow-2xl md:p-6"
    >
      <div className="container mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex gap-4">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-light sm:flex">
            <Cookie className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <div>
            <p id="cookie-consent-title" className="font-semibold text-foreground">
              {isEn ? "We use cookies" : "Nous utilisons des cookies"}
            </p>
            <p id="cookie-consent-desc" className="mt-1 text-sm text-gray-text">
              {isEn ? (
                <>
                  Analytics cookies help us improve the site. You can accept or decline.{" "}
                  <Link
                    href="/en/privacy#cookies"
                    className="text-primary underline underline-offset-2"
                  >
                    Learn more
                  </Link>
                </>
              ) : (
                <>
                  Des cookies analytiques nous aident à améliorer le site. Vous pouvez
                  accepter ou refuser.{" "}
                  <Link
                    href="/politique-confidentialite#cookies"
                    className="text-primary underline underline-offset-2"
                  >
                    En savoir plus
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            size="sm"
            className="justify-center text-foreground"
            onClick={() => setCookieConsent("rejected")}
          >
            {isEn ? "Decline" : "Refuser"}
          </Button>
          <Button
            size="sm"
            className="justify-center"
            onClick={() => setCookieConsent("accepted")}
          >
            {isEn ? "Accept" : "Accepter"}
          </Button>
        </div>
      </div>
    </div>
  );
}
