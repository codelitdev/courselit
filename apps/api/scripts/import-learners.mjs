import { systemClock } from "@codelitdev/platform";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema/index.ts";
import {
  importLegacyLearners,
  readLegacyLearnerExport,
} from "../src/migrations/learners.ts";

function flag(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

const inputPath = flag("--input");
const databaseUrl = process.env.DATABASE_URL;
if (!inputPath || !databaseUrl) {
  throw new Error(
    "usage: DATABASE_URL=... bun scripts/import-learners.mjs --input learners.json [--apply]",
  );
}

const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
const sourceSystem = flag("--source-system") ?? "courselit-mongo";
const client = new Pool({ connectionString: databaseUrl });
try {
  const db = drizzle(client, { schema });
  const result = await importLegacyLearners(db, {
    records: readLegacyLearnerExport(inputPath),
    clock: systemClock,
    mode,
    sourceSystem,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.counts.rejected > 0) process.exitCode = 2;
} finally {
  await client.end();
}
