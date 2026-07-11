import { z } from "zod";
import { withDb } from "@/lib/db";
import {
  DEFAULT_PAYMENT_SETTINGS,
  type PaymentSettings,
} from "@/lib/payment-settings-types";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const updatePaymentSettingsSchema = z.object({
  accountHolder: z.string().trim().min(1).max(120),
  bankName: optionalText(120),
  iban: optionalText(64),
  bic: optionalText(16),
  orangeMoneyNumber: optionalText(32),
  waveNumber: optionalText(32),
  mtnMomoNumber: optionalText(32),
  paymentNote: z.string().trim().max(2000),
  onlineEnabled: z.boolean(),
});

export function isCinetPayConfigured(): boolean {
  return Boolean(process.env.CINETPAY_API_KEY?.trim() && process.env.CINETPAY_SITE_ID?.trim());
}

export function mergePaymentSettings(stored: Partial<PaymentSettings> | null | undefined): PaymentSettings {
  return { ...DEFAULT_PAYMENT_SETTINGS, ...(stored ?? {}) };
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  return withDb(async (query) => {
    const { rows } = await query<{ payment_settings: PaymentSettings | null }>(
      `SELECT payment_settings FROM crm_settings WHERE id = 1`,
    );
    return mergePaymentSettings(rows[0]?.payment_settings);
  });
}

export async function updatePaymentSettings(
  input: z.infer<typeof updatePaymentSettingsSchema>,
): Promise<PaymentSettings> {
  return withDb(async (query) => {
    const paymentSettings: PaymentSettings = {
      accountHolder: input.accountHolder,
      bankName: input.bankName,
      iban: input.iban,
      bic: input.bic,
      orangeMoneyNumber: input.orangeMoneyNumber,
      waveNumber: input.waveNumber,
      mtnMomoNumber: input.mtnMomoNumber,
      paymentNote: input.paymentNote,
      onlineEnabled: input.onlineEnabled,
    };

    await query(
      `INSERT INTO crm_settings (id, payment_settings, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET payment_settings = $1, updated_at = NOW()`,
      [JSON.stringify(paymentSettings)],
    );

    return paymentSettings;
  });
}
