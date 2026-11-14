import { X509Certificate } from "node:crypto";

/** Bare base64 (no PEM armour, no whitespace) of a DER certificate, or null. */
export function normalizeCertificate(input: string): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const bare = input
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  if (!bare || !/^[A-Za-z0-9+/]+={0,2}$/.test(bare)) {
    return null;
  }
  try {
    new X509Certificate(toPem(bare));
  } catch {
    return null;
  }
  return bare;
}

export function toPem(bare: string): string {
  const lines = bare.match(/.{1,64}/g) ?? [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----`;
}
