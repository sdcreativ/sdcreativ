import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { withDb } from "@/lib/db";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP = 30;
const TOTP_DIGITS = 6;

export type TotpStatus = {
  enabled: boolean;
  pendingSetup: boolean;
};

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string): Buffer {
  const normalized = input.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function buildTotpAuthUrl(email: string, secret: string, issuer = "SD CREATIV CRM"): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP),
  });
  return `otpauth://totp/${label}?${params}`;
}

export function buildTotpQrCodeUrl(otpauthUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", secret).update(buf).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const code =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function generateTotpCode(secret: string, timestamp = Date.now()): string {
  const counter = Math.floor(timestamp / 1000 / TOTP_STEP);
  return hotp(base32Decode(secret), counter);
}

export function verifyTotpCode(secret: string, token: string, window = 1): boolean {
  const normalized = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  const now = Date.now();
  for (let offset = -window; offset <= window; offset += 1) {
    const counter = Math.floor(now / 1000 / TOTP_STEP) + offset;
    const expected = hotp(base32Decode(secret), counter);
    if (
      expected.length === normalized.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(normalized))
    ) {
      return true;
    }
  }

  return false;
}

export async function getTotpStatus(userId: string): Promise<TotpStatus> {
  return withDb(async (query) => {
    const { rows } = await query<{ totp_secret: string | null; totp_enabled: boolean }>(
      `SELECT totp_secret, totp_enabled FROM crm_users WHERE id = $1`,
      [userId],
    );
    const row = rows[0];
    return {
      enabled: row?.totp_enabled ?? false,
      pendingSetup: Boolean(row?.totp_secret && !row.totp_enabled),
    };
  });
}

export async function getTotpSecret(userId: string): Promise<string | null> {
  return withDb(async (query) => {
    const { rows } = await query<{ totp_secret: string | null }>(
      `SELECT totp_secret FROM crm_users WHERE id = $1`,
      [userId],
    );
    return rows[0]?.totp_secret ?? null;
  });
}

export async function getTotpAuthState(userId: string): Promise<{
  enabled: boolean;
  secret: string | null;
} | null> {
  return withDb(async (query) => {
    const { rows } = await query<{ totp_secret: string | null; totp_enabled: boolean }>(
      `SELECT totp_secret, totp_enabled FROM crm_users WHERE id = $1`,
      [userId],
    );
    const row = rows[0];
    if (!row) return null;
    return { enabled: row.totp_enabled, secret: row.totp_secret };
  });
}

export async function beginTotpSetup(userId: string, email: string): Promise<{
  secret: string;
  otpauthUrl: string;
  qrCodeUrl: string;
}> {
  const secret = generateTotpSecret();

  await withDb(async (query) => {
    await query(
      `UPDATE crm_users SET totp_secret = $2, totp_enabled = false, updated_at = NOW() WHERE id = $1`,
      [userId, secret],
    );
  });

  const otpauthUrl = buildTotpAuthUrl(email, secret);
  return { secret, otpauthUrl, qrCodeUrl: buildTotpQrCodeUrl(otpauthUrl) };
}

export async function enableTotp(userId: string, code: string): Promise<boolean> {
  const secret = await getTotpSecret(userId);
  if (!secret || !verifyTotpCode(secret, code)) return false;

  await withDb(async (query) => {
    await query(
      `UPDATE crm_users SET totp_enabled = true, updated_at = NOW() WHERE id = $1`,
      [userId],
    );
  });

  return true;
}

export async function disableTotp(userId: string, code: string): Promise<boolean> {
  const state = await getTotpAuthState(userId);
  if (!state?.enabled || !state.secret || !verifyTotpCode(state.secret, code)) return false;

  await withDb(async (query) => {
    await query(
      `UPDATE crm_users SET totp_secret = NULL, totp_enabled = false, updated_at = NOW() WHERE id = $1`,
      [userId],
    );
  });

  return true;
}
