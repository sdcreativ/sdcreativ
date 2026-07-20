import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { escapeHtml, sendEmail } from "@/lib/email";
import { isCrmE2eEnabled, storeCrmE2eSignatureOtp } from "@/lib/crm-e2e";
import { withDb } from "@/lib/db";
import {
  SIGNATURE_OTP_EXPIRY_MINUTES,
  SIGNATURE_OTP_RESEND_COOLDOWN_SEC,
  type SignatureEntityType,
} from "@/lib/signature/types";
import { logSignatureEvent } from "@/lib/signature/events";

const OTP_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSignatureOtp(): string {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += OTP_CHARSET[randomInt(OTP_CHARSET.length)]!;
  }
  return `SD-${suffix}`;
}

export function hashSignatureOtp(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

function codesMatch(storedHash: string, inputCode: string): boolean {
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(hashSignatureOtp(inputCode), "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createSignatureOtpChallenge(input: {
  entityType: SignatureEntityType;
  entityId: string;
  email: string;
  documentLabel: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ displayTo: string; expiresInMinutes: number }> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    throw new Error("Email destinataire invalide pour le code de signature.");
  }

  return withDb(async (query) => {
    const { rows: recent } = await query<{ created_at: Date }>(
      `SELECT created_at FROM signature_otp_challenges
       WHERE entity_type = $1 AND entity_id = $2 AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [input.entityType, input.entityId],
    );
    const last = recent[0]?.created_at;
    if (last) {
      const elapsed = (Date.now() - last.getTime()) / 1000;
      if (elapsed < SIGNATURE_OTP_RESEND_COOLDOWN_SEC) {
        const wait = Math.ceil(SIGNATURE_OTP_RESEND_COOLDOWN_SEC - elapsed);
        throw new Error(`Patientez ${wait}s avant de renvoyer un code.`);
      }
    }

    const code = generateSignatureOtp();
    const codeHash = hashSignatureOtp(code);
    const expiresAt = new Date(Date.now() + SIGNATURE_OTP_EXPIRY_MINUTES * 60_000);

    await query(
      `INSERT INTO signature_otp_challenges
         (entity_type, entity_id, email, code_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.entityType, input.entityId, email, codeHash, expiresAt],
    );

    storeCrmE2eSignatureOtp(input.entityType, input.entityId, code);

    const sent = await sendEmail({
      to: email,
      subject: `Code de signature — ${input.documentLabel}`,
      html: `
        <p>Bonjour,</p>
        <p>Voici votre code pour signer <strong>${escapeHtml(input.documentLabel)}</strong> auprès de SD CREATIV :</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:0.12em;font-family:monospace">${escapeHtml(code)}</p>
        <p>Valable ${SIGNATURE_OTP_EXPIRY_MINUTES} minutes. Ne le partagez pas.</p>
        <p style="color:#666;font-size:12px">Signature électronique simple renforcée (preuve métier SD CREATIV) — pas une signature eIDAS qualifiée.</p>
      `,
    });
    if (!sent && !isCrmE2eEnabled()) {
      throw new Error("Impossible d'envoyer le code par email. Réessayez plus tard.");
    }

    await logSignatureEvent({
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: "challenge.sent",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      payload: { email },
    });

    return { displayTo: email, expiresInMinutes: SIGNATURE_OTP_EXPIRY_MINUTES };
  });
}

export async function verifySignatureOtp(input: {
  entityType: SignatureEntityType;
  entityId: string;
  code: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ verifiedAt: Date; email: string }> {
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      email: string;
      code_hash: string;
      expires_at: Date;
    }>(
      `SELECT id, email, code_hash, expires_at
       FROM signature_otp_challenges
       WHERE entity_type = $1 AND entity_id = $2 AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [input.entityType, input.entityId],
    );
    const row = rows[0];
    if (!row || row.expires_at.getTime() < Date.now() || !codesMatch(row.code_hash, input.code)) {
      await logSignatureEvent({
        entityType: input.entityType,
        entityId: input.entityId,
        eventType: "otp.failed",
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        payload: {},
      });
      throw new Error("Code de signature invalide ou expiré.");
    }

    const verifiedAt = new Date();
    await query(
      `UPDATE signature_otp_challenges SET consumed_at = $2 WHERE id = $1`,
      [row.id, verifiedAt],
    );

    await logSignatureEvent({
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: "otp.verified",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      payload: { email: row.email },
    });

    return { verifiedAt, email: row.email };
  });
}
