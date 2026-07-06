"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchCrmSettings } from "@/lib/crm-settings-api";
import { DEFAULT_CRM_BRANDING, type CrmBranding } from "@/lib/crm-settings-types";

type CrmBrandingContextValue = {
  branding: CrmBranding;
  loading: boolean;
  setBranding: (branding: CrmBranding) => void;
  refreshBranding: () => Promise<void>;
};

const CrmBrandingContext = createContext<CrmBrandingContextValue | null>(null);

export function CrmBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<CrmBranding>(DEFAULT_CRM_BRANDING);
  const [loading, setLoading] = useState(true);

  const refreshBranding = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await fetchCrmSettings();
      setBranding(settings.branding);
    } catch {
      setBranding(DEFAULT_CRM_BRANDING);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBranding();
  }, [refreshBranding]);

  return (
    <CrmBrandingContext.Provider value={{ branding, loading, setBranding, refreshBranding }}>
      {children}
    </CrmBrandingContext.Provider>
  );
}

export function useCrmBranding(): CrmBrandingContextValue {
  const ctx = useContext(CrmBrandingContext);
  if (!ctx) {
    throw new Error("useCrmBranding must be used within CrmBrandingProvider");
  }
  return ctx;
}

export function useCrmBrandingOptional(): CrmBrandingContextValue | null {
  return useContext(CrmBrandingContext);
}
