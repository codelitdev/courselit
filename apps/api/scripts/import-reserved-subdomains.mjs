import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema/index.ts";
import {
  importReservedSubdomains,
  parseReservedSubdomainList,
} from "../src/reserved-subdomains.ts";

function flag(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

const reasonFlag = flag("--reason");
const inputPath = process.argv
  .slice(2)
  .find((arg, index, args) => !arg.startsWith("--") && args[index - 1] !== "--reason");
const databaseUrl = process.env.DATABASE_URL;
if (!inputPath || !databaseUrl) {
  throw new Error(
    "usage: DATABASE_URL=... bun scripts/import-reserved-subdomains.mjs <file> [--reason legacy]",
  );
}

const reason = reasonFlag ?? "legacy";
const { valid, invalid } = parseReservedSubdomainList(readFileSync(inputPath, "utf8"));
for (const value of invalid) {
  process.stderr.write(
    `warning: skipping invalid subdomain ${JSON.stringify(value)}\n`,
  );
}

const client = new Pool({ connectionString: databaseUrl });
try {
  const db = drizzle(client, { schema });
  const { inserted, existing } = await importReservedSubdomains(db, valid, reason);
  process.stdout.write(
    `${JSON.stringify({ read: valid.length + invalid.length, inserted, existing, invalid: invalid.length, reason })}\n`,
  );
} finally {
  await client.end();
}
