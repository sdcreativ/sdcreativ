"use client";

import Image from "next/image";
import Link from "next/link";
import { LOGO, LOGO_FOOTER, SITE } from "@/lib/constants";
import { resolveImageDisplayUrl, isProxiedMediaUrl } from "@/lib/image-url";
import { useSitePublic } from "@/components/site/SitePublicProvider";
import { cn } from "@/lib/utils";

export type LogoSize = "header" | "footer" | "panel" | "panelMobile" | "centered" | "sidebar";

export const LOGO_IMAGE_SIZES: Record<LogoSize, string> = {
  header: "h-12 w-auto object-contain md:h-14",
  footer: "h-14 w-auto object-contain md:h-16",
  panel: "h-16 w-auto max-w-[min(100%,20rem)] object-contain xl:h-[4.5rem]",
  panelMobile: "h-14 w-auto max-w-[min(100%,18rem)] object-contain sm:h-16",
  centered: "mx-auto h-14 w-auto object-contain",
  sidebar: "h-11 w-auto max-w-full object-contain object-left",
};

type LogoProps = {
  className?: string;
  variant?: "default" | "footer" | "mark";
  size?: LogoSize;
  priority?: boolean;
  href?: string | null;
  /** Logo clair sur fond sombre (sidebar CRM, panneau login) */
  onDark?: boolean;
};

export function Logo({
  className,
  variant = "default",
  size,
  priority = false,
  href = "/",
  onDark = false,
}: LogoProps) {
  const sitePublic = useSitePublic();
  const showTagline = variant === "default";
  const imageSize = size ?? (variant === "footer" ? "footer" : "header");
  const defaultAsset = variant === "footer" ? LOGO_FOOTER : LOGO;
  const customLogo = sitePublic.logoUrl?.trim();
  const usesCustomLogo = Boolean(customLogo && customLogo !== LOGO.src);
  const tagline = sitePublic.tagline || SITE.tagline;
  const altName = sitePublic.companyName || SITE.name;

  const imageSrc = usesCustomLogo
    ? resolveImageDisplayUrl(customLogo!)
    : defaultAsset.src;
  const proxied = isProxiedMediaUrl(imageSrc);

  // logo_sd.svg est déjà conçu pour fond sombre (blanc) : ne pas appliquer
  // brightness-0/invert (sinon tout le canvas opaque devient un carré blanc).
  const darkFilter =
    onDark && usesCustomLogo ? "brightness-0 invert" : undefined;

  const image = usesCustomLogo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt={variant === "footer" ? `${altName} — ${tagline}` : altName}
      className={cn(
        LOGO_IMAGE_SIZES[imageSize],
        darkFilter,
        href !== null && "transition-opacity group-hover:opacity-90",
      )}
    />
  ) : (
    <Image
      src={defaultAsset.src}
      alt={variant === "footer" ? `${altName} — ${tagline}` : altName}
      width={defaultAsset.width}
      height={defaultAsset.height}
      className={cn(
        LOGO_IMAGE_SIZES[imageSize],
        href !== null && "transition-opacity group-hover:opacity-90",
      )}
      priority={priority}
      unoptimized={variant !== "footer" && !proxied}
    />
  );

  if (href === null) {
    return (
      <span
        className={cn(
          showTagline ? "inline-flex shrink-0 items-center gap-3" : "inline-block",
          className,
        )}
      >
        {image}
        {showTagline && (
          <>
            <span className="hidden h-8 w-px bg-gray/80 lg:block" aria-hidden />
            <span className="hidden max-w-[200px] text-[11px] font-medium leading-snug text-[#475569] lg:block">
              {tagline}
            </span>
          </>
        )}
      </span>
    );
  }

  if (variant === "footer") {
    return (
      <Link href={href} className={cn("group inline-block", className)}>
        {image}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex shrink-0 items-center gap-3",
        variant === "mark" && "inline-block",
        className,
      )}
    >
      {image}
      {showTagline && (
        <>
          <span className="hidden h-8 w-px bg-gray/80 lg:block" aria-hidden />
          <span className="hidden max-w-[200px] text-[11px] font-medium leading-snug text-[#475569] lg:block">
            {tagline}
          </span>
        </>
      )}
    </Link>
  );
}
