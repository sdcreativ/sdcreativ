export const CRM_SESSION_CHANGED_EVENT = "crm-session-changed";

export function notifyCrmSessionChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CRM_SESSION_CHANGED_EVENT));
  }
}
