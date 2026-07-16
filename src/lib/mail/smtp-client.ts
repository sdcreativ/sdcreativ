import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import {
  getMailSmtpHost,
  getMailSmtpPort,
  HOSTINGER_MAIL,
} from "@/lib/mail/config";
import type { MailboxCredentials } from "@/lib/mail/crypto";
import { sanitizeMailError } from "@/lib/mail/sanitize-error";

export type SmtpSendInput = {
  credentials: MailboxCredentials;
  host?: string;
  port?: number;
  fromName?: string;
  to: string | string[];
  cc?: string | string[];
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string | null;
  references?: string[];
  /** Message-ID à forcer (avec chevrons). */
  messageId?: string;
};

export type SmtpSendResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
};

function createSmtpTransport(input: {
  credentials: MailboxCredentials;
  host?: string;
  port?: number;
}): Transporter {
  const port = input.port ?? getMailSmtpPort();
  const secure = port === HOSTINGER_MAIL.smtpPortSsl || port === 465;

  return nodemailer.createTransport({
    host: input.host ?? getMailSmtpHost(),
    port,
    secure,
    auth: {
      user: input.credentials.email,
      pass: input.credentials.password,
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 60_000,
  });
}

/**
 * Envoi SMTP via Hostinger (boîte messagerie) — ne pas utiliser Resend ici.
 */
export async function sendMailViaSmtp(input: SmtpSendInput): Promise<SmtpSendResult> {
  const transporter = createSmtpTransport({
    credentials: input.credentials,
    host: input.host,
    port: input.port,
  });

  const fromAddress = input.credentials.email;
  const from = input.fromName?.trim()
    ? `"${input.fromName.trim().replace(/"/g, "")}" <${fromAddress}>`
    : fromAddress;

  try {
    const info = await transporter.sendMail({
      from,
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      text: input.text,
      html: input.html,
      inReplyTo: input.inReplyTo ?? undefined,
      references: input.references?.length
        ? input.references.join(" ")
        : undefined,
      messageId: input.messageId,
    });

    const messageId = String(info.messageId ?? input.messageId ?? "").trim();
    if (!messageId) {
      throw new Error("SMTP OK mais Message-ID manquant.");
    }

    return {
      messageId: messageId.startsWith("<") ? messageId : `<${messageId}>`,
      accepted: (info.accepted ?? []).map(String),
      rejected: (info.rejected ?? []).map(String),
    };
  } catch (error) {
    throw new Error(sanitizeMailError(error, "Échec envoi SMTP."));
  } finally {
    transporter.close();
  }
}
