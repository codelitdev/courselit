import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function encryptionKey(): Buffer {
  const secret =
    process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim() || process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("INTEGRATIONS_ENCRYPTION_KEY_REQUIRED");
  return createHash("sha256").update(secret).digest();
}

/** Encrypt a sister-product team secret for storage in PostgreSQL. The
 * version prefix leaves room for a future key-rotation format. */
export function encryptIntegrationSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptIntegrationSecret(value: string): string {
  const [version, encodedIv, encodedTag, encodedCiphertext] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext) {
    throw new Error("INVALID_INTEGRATION_SECRET");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
