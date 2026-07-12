export const SUBSCRIPTION_INTERVALS = ["monthly", "yearly"] as const;
export type SubscriptionInterval = (typeof SUBSCRIPTION_INTERVALS)[number];

export const SUBSCRIPTION_INTERVAL_LABELS: Record<SubscriptionInterval, string> = {
  monthly: "Mensuel",
  yearly: "Annuel",
};

export const SUBSCRIPTION_STATUSES = ["active", "paused", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Actif",
  paused: "En pause",
  cancelled: "Résilié",
};
