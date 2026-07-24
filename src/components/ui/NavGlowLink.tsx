"use client";

import Link from "next/link";
import type { KeyboardEventHandler } from "react";
import { cn } from "@/lib/utils";

type NavGlowLinkProps = {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  variant?: "header" | "dropdown" | "footer";
  onClick?: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLAnchorElement>;
  role?: string;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: boolean | "menu" | "listbox" | "tree" | "grid" | "dialog";
  "aria-controls"?: string;
};

export function NavGlowLink({
  href,
  children,
  active = false,
  className,
  variant = "header",
  onClick,
  onKeyDown,
  role,
  "aria-expanded": ariaExpanded,
  "aria-haspopup": ariaHaspopup,
  "aria-controls": ariaControls,
}: NavGlowLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={role}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHaspopup}
      aria-controls={ariaControls}
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

  if (base === "/services" || base === "/en/services") {
    return pathname === "/services" || pathname.startsWith("/services/") ||
      pathname === "/en/services" || pathname.startsWith("/en/services/");
  }

  return pathname === base || pathname.startsWith(`${base}/`);
}
