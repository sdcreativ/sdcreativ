"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X, MessageCircle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { NavGlowLink, isNavLinkActive } from "@/components/ui/NavGlowLink";
import { mainNav } from "@/content/navigation";
import { enNav } from "@/i18n/en-content";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { useWhatsappUrl } from "@/components/site/SitePublicProvider";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname() ?? "/";
  const waUrl = useWhatsappUrl();
  const isEn = pathname.startsWith("/en");
  const isAdmin = pathname.startsWith("/admin");
  const nav = isEn ? enNav : mainNav;
  const devisHref = "/devis";
  const ctaLabel = isEn ? "Get a quote" : "Demander un devis";
  const servicesLabel = isEn ? "Services" : "Services";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  if (isAdmin) return null;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-[#e8e8e8] bg-[#f6f6f6] transition-all duration-300",
        scrolled && "border-[#e0e0e0] shadow-[0_4px_20px_rgba(0,0,0,0.06)]",
      )}
    >
      <div className="container mx-auto flex h-[4.5rem] items-center gap-4 px-4 md:h-[4.75rem] md:px-6 lg:px-8">
        <Logo className="shrink-0" />

        <nav
          className="hidden flex-1 justify-center lg:flex"
          aria-label="Navigation principale"
        >
          <div className="nav-pill-track">
            {nav.map((item) =>
              "children" in item && item.children ? (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => setServicesOpen(true)}
                  onMouseLeave={() => setServicesOpen(false)}
                >
                  <NavGlowLink
                    href={item.href}
                    active={
                      isNavLinkActive(item.href, pathname) || servicesOpen
                    }
                    className={cn(servicesOpen && !isNavLinkActive(item.href, pathname) && "bg-[#f1f5f9] text-[var(--dark)]")}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 opacity-60 transition-transform duration-300",
                        servicesOpen && "rotate-180 opacity-100",
                      )}
                      aria-hidden
                    />
                  </NavGlowLink>
                  {servicesOpen && (
                    <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-50 -translate-x-1/2 pt-1">
                      <div className="nav-dropdown-panel">
                        <p className="nav-dropdown-panel__label">{servicesLabel}</p>
                        {item.children.map((child) => (
                          <NavGlowLink
                            key={child.href}
                            href={child.href}
                            variant="dropdown"
                          >
                            {child.label}
                          </NavGlowLink>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <NavGlowLink
                  key={item.href}
                  href={item.href}
                  active={isNavLinkActive(item.href, pathname)}
                >
                  {item.label}
                </NavGlowLink>
              ),
            )}
          </div>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-2.5">
          <LocaleSwitcher className="hidden sm:flex" />
          <div className="hidden items-center gap-2 md:flex">
            <Button
              href={devisHref}
              size="sm"
              className="rounded-full px-5 shadow-[0_4px_16px_rgba(0,114,181,0.4)] hover:shadow-[0_6px_20px_rgba(0,114,181,0.45)]"
            >
              {ctaLabel}
            </Button>
            <Button
              href={waUrl}
              external
              variant="whatsappLight"
              size="sm"
              className="rounded-full px-4 font-semibold"
            >
              <MessageCircle className="h-4 w-4 text-[#25D366]" aria-hidden />
              <span className="hidden xl:inline">WhatsApp</span>
            </Button>
          </div>

          {mobileOpen ? (
            <button
              type="button"
              className="rounded-xl border border-[#e0e0e0] bg-white p-2.5 text-foreground shadow-sm transition-colors hover:bg-gray-light lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label={isEn ? "Close menu" : "Fermer le menu"}
              aria-expanded="true"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              className="rounded-xl border border-[#e0e0e0] bg-white p-2.5 text-foreground shadow-sm transition-colors hover:bg-gray-light lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={isEn ? "Open menu" : "Ouvrir le menu"}
              aria-expanded="false"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 top-[4.5rem] z-40 bg-black/50 backdrop-blur-sm lg:hidden md:top-[4.75rem]"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div
            id="mobile-navigation"
            className="fixed inset-x-0 top-[4.5rem] z-50 max-h-[calc(100vh-4.5rem)] overflow-y-auto border-b border-gray/60 bg-[#f6f6f6] lg:hidden md:top-[4.75rem]"
          >
            <nav className="container mx-auto px-4 py-5" aria-label="Navigation mobile">
              <div className="flex flex-col gap-1 rounded-2xl border border-[#e0e0e0] bg-white p-2 shadow-sm">
                {nav.map((item) => (
                  <div key={item.href}>
                    <NavGlowLink
                      href={item.href}
                      variant="dropdown"
                      active={isNavLinkActive(item.href, pathname)}
                      className="text-base"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </NavGlowLink>
                    {"children" in item &&
                      item.children?.map((child) => (
                        <NavGlowLink
                          key={child.href}
                          href={child.href}
                          variant="dropdown"
                          className="pl-6 text-sm opacity-80"
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.label}
                        </NavGlowLink>
                      ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-center sm:hidden">
                <LocaleSwitcher />
              </div>
              <div className="mt-5 flex flex-col gap-2.5">
                <Button href={devisHref} className="w-full justify-center rounded-full">
                  {ctaLabel}
                </Button>
                <Button
                  href={waUrl}
                  external
                  variant="whatsappLight"
                  className="w-full justify-center rounded-full"
                >
                  <MessageCircle className="h-4 w-4 text-[#25D366]" />
                  WhatsApp
                </Button>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
