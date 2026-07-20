export type ClientPortalSection =
  | "overview"
  | "project"
  | "messages"
  | "files"
  | "payments"
  | "quotes"
  | "invoices"
  | "offers"
  | "support"
  | "settings";

export type { ClientProfileData as ClientProfile } from "@/lib/client-portal-config";

export type ProjectStep = {
  id: number;
  label: string;
  status: "done" | "current" | "upcoming";
};
