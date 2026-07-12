function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("225")) return `+${digits}`;
  if (digits.startsWith("0")) return `+225${digits.slice(1)}`;
  return `+${digits}`;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_API_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  ) || Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_WHATSAPP_FROM?.trim(),
  );
}

/** Envoi WhatsApp — Meta Cloud API ou Twilio WhatsApp. */
export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const phone = normalizePhone(to);
  const text = body.slice(0, 1600);

  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;

  if (twilioSid && twilioToken && twilioFrom) {
    const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: `whatsapp:${phone}`,
          From: twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`,
          Body: text,
        }),
      },
    );
    if (!res.ok) {
      console.error("[WhatsApp Twilio]", res.status, await res.text());
      return false;
    }
    return true;
  }

  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (token && phoneNumberId) {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace("+", ""),
          type: "text",
          text: { body: text },
        }),
      },
    );
    if (!res.ok) {
      console.error("[WhatsApp Meta]", res.status, await res.text());
      return false;
    }
    return true;
  }

  console.info("[WhatsApp — mode console]", { to: phone, body: text });
  return true;
}
