/**
 * Subdomains no school can take (docs/wip/plan-limits.md, S19). They name
 * CourseLit's own services or read as official, so a school using one could
 * pass for CourseLit (`login.courselit.app`, `billing.courselit.app`).
 */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  "abuse",
  "account",
  "accounts",
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "billing",
  "blog",
  "cdn",
  "courselit",
  "dashboard",
  "dev",
  "docs",
  "help",
  "login",
  "mail",
  "mcp",
  "media",
  "oauth",
  "pay",
  "payment",
  "payments",
  "postmaster",
  "root",
  "security",
  "signin",
  "signup",
  "sso",
  "staff",
  "staging",
  "static",
  "status",
  "support",
  "test",
  "webhook",
  "webhooks",
  "www",
]);

export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED_SUBDOMAINS.has(subdomain.trim().toLowerCase());
}
