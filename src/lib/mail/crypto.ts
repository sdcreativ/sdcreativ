import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export type MailboxCredentials = {
  email: string;
  password: string;
};

function deriveKey(secret: string): Buffer {
  // Normalise toute passphrase ≥ 32 chars en clé 32 octets.
  return createHash("sha256").update(secret, "utf8").digest();
}

function getSecret(): string {
  const secret = process.env.MAIL_CREDENTIALS_SECRET?.trim() ?? "";
  if (secret.length < 32) {
    throw new Error(
      "MAIL_CREDENTIALS_SECRET manquant ou trop court (minimum 32 caractères).",
    );
  }
  return secret;
}

/**
 * Chiffre les identifiants boîte (AES-256-GCM).
 * Format stocké : base64(iv | authTag | ciphertext) — préfixe version `v1:`.
 */
export function encryptMailboxCredentials(credentials: MailboxCredentials): string {
  const key = deriveKey(getSecret());
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const plaintext = Buffer.from(JSON.stringify(credentials), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]);
  return `v1:${payload.toString("base64")}`;
}

export function decryptMailboxCredentials(payload: string): MailboxCredentials {
  const key = deriveKey(getSecret());
  if (!payload.startsWith("v1:")) {
    throw new Error("Format de credentials mail inconnu (attendu v1:…).");
  }
  const raw = Buffer.from(payload.slice(3), "base64");
  if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("Payload credentials mail invalide.");
  }
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const parsed = JSON.parse(plaintext.toString("utf8")) as MailboxCredentials;
  if (
    typeof parsed?.email !== "string" ||
    typeof parsed?.password !== "string" ||
    !parsed.email.trim() ||
    !parsed.password
  ) {
    throw new Error("Credentials mail déchiffrés invalides.");
  }
  return { email: parsed.email.trim().toLowerCase(), password: parsed.password };
}

/** Génère une valeur candidate pour MAIL_CREDENTIALS_SECRET (à coller dans .env.docker). */
export function generateMailCredentialsSecret(): string {
  return randomBytes(KEY_LENGTH).toString("base64url");
}
