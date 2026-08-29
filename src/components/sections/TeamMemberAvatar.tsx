"use client";

import { useState } from "react";
import { DEFAULT_IMAGE_POSITION } from "@/lib/image-position";
import { resolveImageDisplayUrl } from "@/lib/image-url";
import { MediaImage } from "@/components/ui/MediaImage";
import { cn } from "@/lib/utils";

type Props = {
  image: string;
  imageAlt: string;
  imagePosition?: string;
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
  const pixelSize = size === "large" ? 160 : 80;

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
      <MediaImage
        src={src}
        alt={imageAlt}
        fill
        sizes={`${pixelSize}px`}
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
    </div>
  );
}
