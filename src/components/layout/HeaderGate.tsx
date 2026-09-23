"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";

export function HeaderGate() {
  const pathname = usePathname() ?? "";
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/espace-client") ||
    pathname.startsWith("/presentation") ||
    pathname.startsWith("/c/")
  ) {
    return null;
  }
  return <Header />;
}
