"use client";

import { usePathname } from "next/navigation";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

export function FloatingWidgets() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin") || pathname.startsWith("/espace-client") || pathname.startsWith("/presentation")) return null;

  return (
    <>
      <ChatWidget />
      <ScrollToTop />
      <WhatsAppFloat />
    </>
  );
}
