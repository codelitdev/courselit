/**
 * Platform-staff commands (docs/wip/plan-limits.md, S26). Run on the API
 * server with access to its database:
 *
 *   bun run staff suspend <school> --reason "<why>" --actor <you>
 *   bun run staff unsuspend <school> --actor <you>
 *   bun run staff import-school --owner-email <email> --name <name> --subdomain <slug> --main-school <id> --actor <you>
 *   bun run staff remove-imported <school> --actor <you>
 *
 * <school> is a subdomain or a public school id.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "../src/db/schema/index.js";
import {
  importSchool,
  removeImportedSchool,
  type StaffResult,
  suspendSchool,
  unsuspendSchool,
} from "../src/staff.js";
import type { AppDb } from "../src/types.js";

const [command, ...rest] = process.argv.slice(2);
const flags: Record<string, string> = {};
const positional: string[] = [];
for (let i = 0; i < rest.length; i += 1) {
  const arg = rest[i]!;
  if (arg.startsWith("--")) {
    flags[arg.slice(2)] = rest[i + 1] ?? "";
    i += 1;
  } else positional.push(arg);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");
const client = new Client({ connectionString: databaseUrl });
await client.connect();
const db = drizzle(client, { schema }) as unknown as AppDb;
const clock = { now: () => new Date() };

let result: StaffResult;
switch (command) {
  case "suspend":
    result = await suspendSchool(db, clock, {
      school: positional[0] ?? "",
      reason: flags.reason ?? "",
      actor: flags.actor ?? "",
    });
    break;
  case "unsuspend":
    result = await unsuspendSchool(db, clock, {
      school: positional[0] ?? "",
      actor: flags.actor ?? "",
      reason: flags.reason,
    });
    break;
  case "import-school":
    result = await importSchool(db, clock, {
      ownerEmail: flags["owner-email"] ?? "",
      name: flags.name ?? "",
      subdomain: flags.subdomain ?? "",
      mainSchool: flags["main-school"] ?? "",
      actor: flags.actor ?? "",
    });
    break;
  case "remove-imported":
    result = await removeImportedSchool(db, clock, {
      school: positional[0] ?? "",
      actor: flags.actor ?? "",
      reason: flags.reason,
    });
    break;
  default:
    result = { ok: false, error: `unknown command: ${command ?? "(none)"}` };
}
await client.end();
if (result.ok) {
  process.stdout.write(`${result.message}\n`);
} else {
  process.stderr.write(`error: ${result.error}\n`);
  process.exit(1);
}
