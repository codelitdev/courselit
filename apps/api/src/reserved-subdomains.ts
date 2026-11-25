import { inArray } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

const SUBDOMAIN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Whether a value is a well-formed school address label. */
export function isValidSubdomain(value: string): boolean {
  return value.length >= 3 && value.length <= 63 && SUBDOMAIN_PATTERN.test(value);
}

/**
 * Product and infrastructure hostnames that no school may take. Subdomains
 * reserved for other reasons (such as schools on the classic app) live in the
 * `reserved_subdomains` table, never here.
 */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  "account",
  "accounts",
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "beta",
  "billing",
  "blog",
  "cdn",
  "classic",
  "console",
  "courselit",
  "dash",
  "dashboard",
  "dev",
  "docs",
  "email",
  "ftp",
  "help",
  "imap",
  "internal",
  "localhost",
  "login",
  "logout",
  "mail",
  "mcp",
  "media",
  "my",
  "ns1",
  "ns2",
  "oauth",
  "platform",
  "pop",
  "portal",
  "prod",
  "production",
  "qa",
  "queue",
  "signin",
  "signup",
  "sites",
  "smtp",
  "sso",
  "staging",
  "static",
  "status",
  "storefront",
  "studio",
  "support",
  "test",
  "webhook",
  "webhooks",
  "webmail",
  "www",
]);

/** The labels among `labels` that are reserved, by code or by the database. */
export async function reservedAmong(db: AppDb, labels: string[]): Promise<Set<string>> {
  const reserved = new Set(labels.filter((label) => RESERVED_SUBDOMAINS.has(label)));
  const rest = labels.filter((label) => !reserved.has(label));
  if (rest.length === 0) return reserved;
  const rows = await db
    .select({ value: schema.reservedSubdomains.subdomain })
    .from(schema.reservedSubdomains)
    .where(inArray(schema.reservedSubdomains.subdomain, rest));
  for (const row of rows) reserved.add(row.value);
  return reserved;
}

export async function isReservedSubdomain(db: AppDb, label: string): Promise<boolean> {
  return (await reservedAmong(db, [label])).size > 0;
}

/**
 * Reads a reserved-subdomain list: a JSON array of strings, or one subdomain
 * per line (blank lines and `#` comments are ignored). Values are trimmed and
 * lowercased; duplicates are dropped and malformed labels are returned apart.
 */
export function parseReservedSubdomainList(text: string): {
  valid: string[];
  invalid: string[];
} {
  const trimmed = text.trim();
  let raw: unknown[];
  if (trimmed.startsWith("[")) {
    const parsed: unknown = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new Error("RESERVED_SUBDOMAINS_NOT_AN_ARRAY");
    raw = parsed;
  } else {
    raw = trimmed.split(/\r?\n/).filter((line) => !line.trim().startsWith("#"));
  }
  const valid = new Set<string>();
  const invalid: string[] = [];
  for (const entry of raw) {
    const value = String(entry ?? "")
      .trim()
      .toLowerCase();
    if (!value) continue;
    if (isValidSubdomain(value)) valid.add(value);
    else invalid.push(value);
  }
  return { valid: [...valid], invalid };
}

/** Inserts subdomains into `reserved_subdomains`, leaving existing rows as they are. */
export async function importReservedSubdomains(
  db: AppDb,
  subdomains: string[],
  reason: string,
): Promise<{ inserted: number; existing: number }> {
  let inserted = 0;
  const batchSize = 1000;
  for (let i = 0; i < subdomains.length; i += batchSize) {
    const batch = subdomains.slice(i, i + batchSize);
    const rows = await db
      .insert(schema.reservedSubdomains)
      .values(batch.map((subdomain) => ({ subdomain, reason })))
      .onConflictDoNothing({ target: schema.reservedSubdomains.subdomain })
      .returning({ subdomain: schema.reservedSubdomains.subdomain });
    inserted += rows.length;
  }
  return { inserted, existing: subdomains.length - inserted };
}
