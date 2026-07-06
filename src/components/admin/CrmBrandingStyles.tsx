"use client";

import { useEffect } from "react";
import { useCrmBranding } from "@/components/admin/CrmBrandingProvider";
import { DEFAULT_CRM_BRANDING } from "@/lib/crm-settings-types";

/** Applique le branding CRM (couleurs CSS) sur le shell admin. */
export function CrmBrandingStyles() {
  const { branding } = useCrmBranding();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--crm-primary",
      branding.primaryColor || DEFAULT_CRM_BRANDING.primaryColor,
    );
    root.style.setProperty(
      "--crm-accent",
      branding.accentColor || DEFAULT_CRM_BRANDING.accentColor,
    );
  }, [branding.primaryColor, branding.accentColor]);

  return null;
}
