"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchCrmSession, type CrmSessionInfo } from "@/lib/crm-settings-api";
import { hasCrmPermission } from "@/lib/crm-access";
import { CRM_SESSION_CHANGED_EVENT } from "@/lib/crm-session-events";
import type { CrmPermission } from "@/lib/crm-permissions";

export function useCrmPermissions() {
  const [session, setSession] = useState<CrmSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    void fetchCrmSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(CRM_SESSION_CHANGED_EVENT, load);
    return () => window.removeEventListener(CRM_SESSION_CHANGED_EVENT, load);
  }, [load]);

  const permissions = session?.permissions ?? [];

  return {
    session,
    permissions,
    loading,
    can: (required: CrmPermission | CrmPermission[] | null | undefined) =>
      hasCrmPermission(permissions, required),
  };
}
