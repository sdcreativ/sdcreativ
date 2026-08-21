import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

function getMetaTokenSecret(): string {
  const dedicated = process.env.META_TOKEN_SECRET?.trim() ?? "";
  if (dedicated.length >= 32) return dedicated;
  const fallback = process.env.ADMIN_SECRET?.trim() ?? "";
  if (fallback.length >= 16) return fallback;
  throw new Error(
    "META_TOKEN_SECRET (min. 32 car.) ou ADMIN_SECRET requis pour chiffrer les tokens Facebook.",
  );
}

/** Chiffre un secret opaque (token Page / user). Format `v1:` + base64(iv|tag|ciphertext). */
export function encryptMetaSecret(plaintext: string): string {
  const key = deriveKey(getMetaTokenSecret());
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `v1:${Buffer.concat([iv, authTag, encrypted]).toString("base64")}`;
}

export function decryptMetaSecret(payload: string): string {
  const key = deriveKey(getMetaTokenSecret());
  if (!payload.startsWith("v1:")) {
    throw new Error("Format de token Meta inconnu (attendu v1:…).");
  }
  const raw = Buffer.from(payload.slice(3), "base64");
  if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("Payload token Meta invalide.");
  }
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
