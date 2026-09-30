import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "./integration-secrets.js";

const SECRET_ENV_KEYS = [
  "INTEGRATIONS_ENCRYPTION_KEY",
  "AUTH_SECRET",
] as const;

let originalSecrets: Partial<Record<(typeof SECRET_ENV_KEYS)[number], string>>;

describe("integration secret encryption", () => {
  beforeEach(() => {
    originalSecrets = Object.fromEntries(
      SECRET_ENV_KEYS.map((key) => [key, process.env[key]]),
    );
    for (const key of SECRET_ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of SECRET_ENV_KEYS) {
      const original = originalSecrets[key];
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    }
  });

  it("uses the integration key before AUTH_SECRET and supports AUTH_SECRET as fallback", () => {
    process.env.AUTH_SECRET = "platform-auth-secret";
    const authEncrypted = encryptIntegrationSecret("auth-fallback-value");
    expect(decryptIntegrationSecret(authEncrypted)).toBe("auth-fallback-value");

    process.env.INTEGRATIONS_ENCRYPTION_KEY = "integration-encryption-key";
    const integrationEncrypted = encryptIntegrationSecret("integration-key-value");
    process.env.AUTH_SECRET = "rotated-platform-auth-secret";
    expect(decryptIntegrationSecret(integrationEncrypted)).toBe(
      "integration-key-value",
    );
  });
});
