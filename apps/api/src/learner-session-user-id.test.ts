import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// `LearnerSession.userId` can be a real platform user for an SSO learner, so
// it must never leave the school. Nothing reads it today; this scan keeps it
// that way. Reads of a school account's `userId` are scanned the same way.

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
}

const PLATFORM_TABLES = /schema\.(user|session|account|selectedSchools|memberships)\b/;

// Every place a learner session's or school account's user id is read.
const ALLOWED_READS: Record<string, number> = {
  // building the session from its own row
  "learners.ts": 1,
  // admin team screens comparing team accounts with the signed-in admin
  "team.ts": 2,
  // reading a school account's own user inside one school (shadow-user check)
  "learner-sso.ts": 1,
  // creating a Better Auth session, not reading a learner session
  "auth/options.ts": 1,
};

describe("LearnerSession.userId", () => {
  it("is never read outside the learner module", () => {
    const base = join(import.meta.dir);
    const reads: Record<string, number> = {};
    const pattern =
      /(?<!schema\.)\b(?:learnerAuth\.value|learnerSession|learner|session|schoolAccount|account)\.userId\b/g;
    for (const file of sourceFiles(base)) {
      const rel = file.slice(base.length + 1);
      if (rel.startsWith("migrations/") || rel.startsWith("db/")) continue;
      const matches = readFileSync(file, "utf8").match(pattern);
      if (matches) reads[rel] = matches.length;
    }
    expect(reads).toEqual(ALLOWED_READS);
  });

  it("no file that handles learner sessions queries platform-wide tables with a session user id", () => {
    const base = join(import.meta.dir);
    for (const file of ["dispatch.ts", "express-app.ts", "learner-sign-in.ts"]) {
      const source = readFileSync(join(base, file), "utf8");
      for (const line of source.split("\n")) {
        if (/(?<!schema\.)\b(?:learnerAuth\.value|learnerSession|session)\.userId\b/.test(line)) {
          expect(PLATFORM_TABLES.test(line)).toBe(false);
        }
      }
    }
  });
});
