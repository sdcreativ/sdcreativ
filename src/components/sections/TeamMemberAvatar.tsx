"use client";

import { useState } from "react";
import Image from "next/image";
import { DEFAULT_IMAGE_POSITION } from "@/lib/image-position";
import { resolveImageDisplayUrl, isProxiedMediaUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

type Props = {
  image: string;
  imageAlt: string;
  imagePosition?: string;
  /** Chemin local de secours (ex. /images/team/….png). */
  fallbackSrc?: string | null;
  initials?: string;
  size: "compact" | "large";
  className?: string;
};

export function TeamMemberAvatar({
  image,
  imageAlt,
  imagePosition,
  fallbackSrc,
  initials,
  size,
  className,
}: Props) {
  const primary = resolveImageDisplayUrl(image);
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(false);

  const avatarClass =
    size === "large" ? "mb-5 h-28 w-28 md:h-32 md:w-32" : "mb-4 h-20 w-20";

  if (failed) {
    return (
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary ring-4 ring-primary-light",
          avatarClass,
          className,
        )}
        aria-label={imageAlt}
      >
        <span className={cn("font-bold", size === "large" ? "text-2xl" : "text-lg")}>
          {(initials || "?").slice(0, 2)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-gray-light ring-4 ring-primary-light",
        avatarClass,
        size === "large" && "shadow-md transition-transform duration-300 group-hover:scale-105",
        className,
      )}
    >
      {/* img natif pour /api/media (évite _next/image) + fallback local */}
      {isProxiedMediaUrl(src) || src.startsWith("/images/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={imageAlt}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: imagePosition ?? DEFAULT_IMAGE_POSITION }}
          onError={() => {
            if (fallbackSrc && src !== fallbackSrc) {
              setSrc(fallbackSrc);
              return;
            }
            setFailed(true);
          }}
        />
      ) : (
        <Image
          src={src}
          alt={imageAlt}
          fill
          sizes={size === "large" ? "128px" : "80px"}
          unoptimized={isProxiedMediaUrl(src)}
          className="object-cover"
          style={{ objectPosition: imagePosition ?? DEFAULT_IMAGE_POSITION }}
          onError={() => {
            if (fallbackSrc && src !== fallbackSrc) {
              setSrc(fallbackSrc);
              return;
            }
            setFailed(true);
          }}
        />
      )}
    </div>
  );
}
