"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Facebook,
  Linkedin,
  Link2,
  Share2,
  Twitter,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  title: string;
  locale?: "fr" | "en";
  /** Disposition : barre horizontale ou colonne sticky. */
  variant?: "inline" | "rail";
  className?: string;
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function BlogShareLinks({
  url,
  title,
  locale = "fr",
  variant = "inline",
  className,
}: Props) {
  const isEn = locale === "en";
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  const links = [
    {
      key: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: Linkedin,
    },
    {
      key: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: Twitter,
    },
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: Facebook,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
      icon: WhatsAppIcon,
    },
  ] as const;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function nativeShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, url, text: title });
    } catch {
      /* cancelled */
    }
  }

  const isRail = variant === "rail";

  return (
    <div
      className={cn(
        isRail ? "flex flex-col items-center gap-3" : "flex flex-wrap items-center gap-2",
        className,
      )}
    >
      {!isRail && (
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-text">
          {isEn ? "Share" : "Partager"}
        </span>
      )}
      {isRail && (
        <span className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-text [writing-mode:vertical-rl] rotate-180">
          {isEn ? "Share" : "Partager"}
        </span>
      )}

      {links.map(({ key, label, href, icon: Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={isEn ? `Share on ${label}` : `Partager sur ${label}`}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center text-gray-text transition-colors hover:text-primary",
            "border border-gray/70 hover:border-primary/40",
          )}
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}

      <button
        type="button"
        onClick={() => void copyLink()}
        aria-label={isEn ? "Copy link" : "Copier le lien"}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center border border-gray/70 text-gray-text transition-colors hover:border-primary/40 hover:text-primary",
          copied && "border-primary/40 text-primary",
        )}
      >
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      </button>

      {canNativeShare && (
        <button
          type="button"
          onClick={() => void nativeShare()}
          aria-label={isEn ? "More share options" : "Plus d’options de partage"}
          className="inline-flex h-9 w-9 items-center justify-center border border-gray/70 text-gray-text transition-colors hover:border-primary/40 hover:text-primary md:hidden"
        >
          <Share2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
