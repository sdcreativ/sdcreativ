import { timingSafeEqual } from "node:crypto";
import type { SignatureEntityType } from "@/lib/signature/types";

const MIN_TOKEN_LENGTH = 32;

const e2eOtpStore = new Map<string, string>();

export function isCrmE2eEnabled(): boolean {
  const token = process.env.CRM_E2E_LOGIN_TOKEN?.trim();
  return Boolean(token && token.length >= MIN_TOKEN_LENGTH);
}

/** Bypass 2FA après mot de passe — uniquement si `CRM_E2E_LOGIN_TOKEN` (≥ 32 car.) est défini. */
export function verifyCrmE2eLoginToken(candidate: string | undefined | null): boolean {
  const expected = process.env.CRM_E2E_LOGIN_TOKEN?.trim();
  if (!expected || expected.length < MIN_TOKEN_LENGTH || !candidate) return false;
  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function otpKey(entityType: SignatureEntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export function storeCrmE2eSignatureOtp(
  entityType: SignatureEntityType,
  entityId: string,
  code: string,
): void {
  if (!isCrmE2eEnabled()) return;
  e2eOtpStore.set(otpKey(entityType, entityId), code);
}

export function takeCrmE2eSignatureOtp(
  entityType: SignatureEntityType,
  entityId: string,
): string | null {
  if (!isCrmE2eEnabled()) return null;
  const key = otpKey(entityType, entityId);
  const code = e2eOtpStore.get(key) ?? null;
  if (code) e2eOtpStore.delete(key);
  return code;
}
