"use client";

import { useEffect, useState } from "react";
import { fetchCrmSession, type CrmSessionInfo } from "@/lib/crm-settings-api";
import { hasCrmPermission } from "@/lib/crm-access";
import type { CrmPermission } from "@/lib/crm-permissions";

export function useCrmPermissions() {
  const [session, setSession] = useState<CrmSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchCrmSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  const permissions = session?.permissions ?? [];

  return {
    session,
    permissions,
    loading,
    can: (required: CrmPermission | CrmPermission[] | null | undefined) =>
      hasCrmPermission(permissions, required),
  };
}
