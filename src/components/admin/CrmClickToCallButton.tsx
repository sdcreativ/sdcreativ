"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Phone } from "lucide-react";
import { fetchThreeCxWebClientUrl } from "@/lib/communications-api";
import { digitsOnly } from "@/lib/threecx/phone";
import { cn } from "@/lib/utils";

/** Click-to-call léger : `tel:` + ouverture Web Client 3CX (hors MakeCall Phase 5). */
export function CrmClickToCallButton({
  phone,
  className,
  compact = false,
}: {
  phone: string | null | undefined;
  className?: string;
  compact?: boolean;
}) {
  const [webClientUrl, setWebClientUrl] = useState<string | null>(null);
  const digits = digitsOnly(phone);

  useEffect(() => {
    void fetchThreeCxWebClientUrl().then(setWebClientUrl).catch(() => setWebClientUrl(null));
  }, []);

  if (!phone?.trim() || !digits) return null;

  const telHref = phone.trim().startsWith("+")
    ? `tel:${phone.replace(/\s+/g, "")}`
    : `tel:+${digits}`;

  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <a
          href={telHref}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <Phone className="h-3.5 w-3.5" aria-hidden />
          {phone}
        </a>
        {webClientUrl && (
          <a
            href={webClientUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir le Web Client 3CX"
            className="rounded-md p-1 text-gray-text hover:bg-primary/10 hover:text-primary"
            aria-label="Web Client 3CX"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </span>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <a
        href={telHref}
        className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
      >
        <Phone className="h-4 w-4" aria-hidden />
        Appeler {phone}
      </a>
      {webClientUrl && (
        <a
          href={webClientUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray/40 px-3 py-2 text-xs font-medium text-gray-text hover:bg-gray-light"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Web Client 3CX
        </a>
      )}
    </div>
  );
}
