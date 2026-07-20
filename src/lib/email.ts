type SendEmailParams = {
  subject: string;
  html: string;
  replyTo?: string;
  to?: string | string[];
  attachments?: Array<{ filename: string; content: Buffer }>;
  /** false = ne pas envelopper avec logo / pied société (défaut: true). */
  chrome?: boolean;
};

export type SendEmailResult =
  | { ok: true }
  | { ok: false; error: string; status?: number };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function htmlRow(label: string, value: string | undefined | null): string {
  if (!value) return "";
  return `<p><strong>${escapeHtml(label)} :</strong> ${escapeHtml(value)}</p>`;
}

function getFromAddress(): string {
  const email = process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com";
  const name = (process.env.CONTACT_FROM_NAME ?? "SD CREATIV").trim();
  if (!name) return email;
  const safeName = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${safeName}" <${email}>`;
}

/** Version texte pour améliorer la délivrabilité (Gmail / Outlook). */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendEmailDetailed({
  subject,
  html,
  replyTo,
  to,
  attachments,
  chrome = true,
}: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromAddress();
  const recipients = to
    ? (Array.isArray(to) ? to : to.split(",").map((e) => e.trim()).filter(Boolean))
    : [process.env.CONTACT_TO_EMAIL ?? "contact@sdcreativ.com"];

  let finalHtml = html;
  if (chrome) {
    const { applyEmailChrome } = await import("@/lib/email-chrome-apply");
    finalHtml = await applyEmailChrome(html);
  }

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      const error = "RESEND_API_KEY manquante dans .env.docker";
      console.error(`[Email] ${error}`);
      return { ok: false, error };
    }
    console.info("[Email — mode console]", {
      subject,
      replyTo,
      to: recipients,
      attachments: attachments?.map((a) => ({ filename: a.filename, bytes: a.content.byteLength })),
      html: finalHtml,
    });
    return { ok: true };
  }

  if (recipients.length === 0) {
    return { ok: false, error: "Aucun destinataire (CONTACT_TO_EMAIL ou paramètre to)" };
  }

  const payload: Record<string, unknown> = {
      from,
      to: recipients,
      reply_to: replyTo,
      subject,
      html: finalHtml,
      text: htmlToPlainText(finalHtml),
    };

  if (attachments && attachments.length > 0) {
    payload.attachments = attachments.map((file) => ({
      filename: file.filename,
      content: file.content.toString("base64"),
    }));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[Email] Resend error:", res.status, body);
    let message = `Resend HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      if (body) message = body.slice(0, 200);
    }
    return { ok: false, error: message, status: res.status };
  }

  return { ok: true };
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const result = await sendEmailDetailed(params);
  return result.ok;
}

export { escapeHtml };
