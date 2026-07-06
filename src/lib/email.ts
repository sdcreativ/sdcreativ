type SendEmailParams = {
  subject: string;
  html: string;
  replyTo?: string;
  to?: string | string[];
};

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

export async function sendEmail({ subject, html, replyTo, to }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = to
    ? (Array.isArray(to) ? to : to.split(",").map((e) => e.trim()).filter(Boolean))
    : [process.env.CONTACT_TO_EMAIL ?? "contact@sdcreativ.com"];

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Email] RESEND_API_KEY manquante — envoi impossible en production.");
      return false;
    }
    console.info("[Email — mode console]", { subject, replyTo, to: recipients, html });
    return true;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com",
      to: recipients,
      reply_to: replyTo,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", await res.text());
    return false;
  }

  return true;
}

export { escapeHtml };
