"use client";

import { useEffect } from "react";

export function OfflineOrgContext({ organizationId }: { organizationId: string }) {
  useEffect(() => {
    try {
      localStorage.setItem("kanako-ai-active-org", organizationId);
    } catch {
      // Offline mode remains usable for local-only work if browser storage is blocked.
    }
  }, [organizationId]);
  return null;
}
