"use client";

import Link from "next/link";
import { Logo, LOGO_IMAGE_SIZES, type LogoSize } from "@/components/ui/Logo";
import { LOGO, SITE } from "@/lib/constants";
import { resolveImageDisplayUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";
import { useCrmBranding } from "@/components/admin/CrmBrandingProvider";
import { useSitePublic } from "@/components/site/SitePublicProvider";

type Props = {
  href?: string | null;
  size?: LogoSize;
  className?: string;
  priority?: boolean;
  /** Conservé pour compatibilité — plus de filtre invert (carré blanc). */
  onDark?: boolean;
};

/**
 * Logo sidebar CRM : branding CRM si défini, sinon logo site public, sinon PNG par défaut.
 */
export function CrmLogo({
  href = "/admin/crm",
  size = "sidebar",
  className,
  priority = false,
  onDark = true,
}: Props) {
  const { branding, loading } = useCrmBranding();
  const sitePublic = useSitePublic();

  const brandingLogo = branding.logoUrl?.trim() || "";
  const siteLogo = sitePublic.logoUrl?.trim() || "";
  const logoUrl =
    brandingLogo ||
    (siteLogo && siteLogo !== LOGO.src ? siteLogo : "");
  const agencyName =
    branding.agencyName || sitePublic.companyName || SITE.name;

  const imageClass = cn(
    LOGO_IMAGE_SIZES[size],
    "object-contain object-left",
    href !== null && "transition-opacity group-hover:opacity-90",
  );

  if (!loading && logoUrl) {
    const displaySrc = resolveImageDisplayUrl(logoUrl);
    const image = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={displaySrc} alt={agencyName} className={imageClass} />
    );

    if (href === null) {
      return <span className={cn("inline-block", className)}>{image}</span>;
    }

    return (
      <Link href={href} className={cn("group inline-block", className)}>
        {image}
      </Link>
    );
  }

  return (
    <Logo
      href={href}
      variant="mark"
      size={size}
      onDark={onDark}
      priority={priority}
      className={className}
    />
  );
}
