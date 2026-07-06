"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type NavGlowLinkProps = {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  variant?: "header" | "dropdown" | "footer";
  onClick?: () => void;
};

export function NavGlowLink({
  href,
  children,
  active = false,
  className,
  variant = "header",
  onClick,
}: NavGlowLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      data-active={active ? "true" : undefined}
      className={cn(
        "nav-glow-link",
        variant === "header" && "nav-glow-link--header",
        variant === "dropdown" && "nav-glow-link--dropdown",
        variant === "footer" && "nav-glow-link--footer",
        active && "nav-glow-link--active",
        className,
      )}
    >
      <span className="nav-glow-link__inner">{children}</span>
    </Link>
  );
}

export function isNavLinkActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "/en";
  if (href === "/en") return pathname === "/en";

  const base = href.split("#")[0];
  if (!base) return false;

  if (base === "/services") {
    return pathname === "/services" || pathname.startsWith("/en/services");
  }

  return pathname === base || pathname.startsWith(`${base}/`);
}
