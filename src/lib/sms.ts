export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

/** Normalise un numéro (défaut indicatif CI +225 si local). */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("225")) return `+${digits}`;
  if (digits.startsWith("0")) return `+225${digits.slice(1)}`;
  return `+${digits}`;
}

export function isValidPhone(raw: string): boolean {
  const normalized = normalizePhone(raw);
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}

/** Affichage masqué pour l’UI 2FA. */
export function maskPhone(raw: string): string {
  const normalized = normalizePhone(raw);
  if (normalized.length < 6) return normalized;
  return `${normalized.slice(0, 4)}••••${normalized.slice(-2)}`;
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.info("[SMS — mode console]", { to, body });
    return true;
  }

  const phone = normalizePhone(to);
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phone, From: from, Body: body.slice(0, 1600) }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[SMS Twilio]", res.status, text);
    return false;
  }

  return true;
}
