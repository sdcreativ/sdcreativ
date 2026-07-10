"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/Footer";

export function FooterGate() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin") || pathname.startsWith("/espace-client") || pathname.startsWith("/presentation")) return null;
  return <Footer />;
}
