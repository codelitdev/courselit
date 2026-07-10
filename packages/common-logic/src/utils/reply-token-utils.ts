import crypto from "crypto";
import type { ReplyTokenPayload } from "@courselit/common-models";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
    const key = process.env.REPLY_EMAIL_SECRET;
    if (!key) {
        throw new Error("REPLY_EMAIL_SECRET environment variable is not set");
    }
    // Ensure key is 32 bytes for AES-256
    return crypto.scryptSync(key, "courselit-reply-salt", 32);
}

function encodeBase64UrlSafe(buf: Buffer): string {
    return buf
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function decodeBase64UrlSafe(str: string): Buffer {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(padded, "base64");
}

/**
 * Creates a signed, encrypted reply token that can be embedded in the Reply-To header
 * of notification emails. The token encodes the user, domain, discussion context, and
 * a timestamp for expiration.
 */
export function createReplyToken(payload: ReplyTokenPayload): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const data = JSON.stringify({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    });

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(data, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData (all base64url safe)
    return [
        encodeBase64UrlSafe(iv),
        encodeBase64UrlSafe(authTag),
        encodeBase64UrlSafe(encrypted),
    ].join(":");
}

/**
 * Decrypts and validates a reply token. Returns the payload if valid, or null if
 * the token is invalid, expired, or tampered with.
 */
export function verifyReplyToken(token: string): ReplyTokenPayload | null {
    try {
        const parts = token.split(":");
        if (parts.length !== 3) {
            return null;
        }

        const iv = decodeBase64UrlSafe(parts[0]);
        const authTag = decodeBase64UrlSafe(parts[1]);
        const encrypted = decodeBase64UrlSafe(parts[2]);

        const key = getEncryptionKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);

        const payload = JSON.parse(decrypted.toString("utf8")) as ReplyTokenPayload & {
            iat: number;
            exp: number;
        };

        // Check expiration
        if (payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        const { iat, exp, ...rest } = payload;
        return rest as ReplyTokenPayload;
    } catch {
        return null;
    }
}

/**
 * Extracts the reply-from email address to use as the Reply-To header.
 * Format: reply+<token>@<inbound-domain>
 */
export function buildReplyToAddress(
    token: string,
    inboundDomain?: string,
): string {
    const domain = inboundDomain || process.env.INBOUND_EMAIL_DOMAIN || "";
    if (!domain) {
        return "";
    }
    return `reply+${token}@${domain}`;
}
