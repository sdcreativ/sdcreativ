import type { PaymentSettings } from "@/lib/payment-settings-types";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function fetchPaymentSettings(): Promise<{
  settings: PaymentSettings;
  cinetPayConfigured: boolean;
}> {
  const res = await fetch("/api/admin/settings/payment", { credentials: "include" });
  return parseJson(res);
}

export async function updatePaymentSettingsApi(
  settings: PaymentSettings,
): Promise<{ settings: PaymentSettings; cinetPayConfigured: boolean }> {
  const res = await fetch("/api/admin/settings/payment", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  return parseJson(res);
}
