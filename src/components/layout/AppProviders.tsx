"use client";

import { DialogProvider } from "@/components/ui/DialogProvider";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { HtmlLangSync } from "@/components/i18n/HtmlLangSync";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <DialogProvider>
      <HtmlLangSync />
      {children}
      <PwaRegister />
    </DialogProvider>
  );
}
