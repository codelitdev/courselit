import { systemClock } from "@codelitdev/platform";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema/index.ts";
import {
  importLegacyPaymentPlans,
  readLegacyPaymentPlanExport,
} from "../src/migrations/payment-plans.ts";
import { readLegacyProductExport } from "../src/migrations/products.ts";

function flag(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

const inputPath = flag("--input");
const productsPath = flag("--products");
const databaseUrl = process.env.DATABASE_URL;
if (!inputPath || !productsPath || !databaseUrl) {
  throw new Error(
    "usage: DATABASE_URL=... bun scripts/import-payment-plans.mjs --input payment-plans.json --products products.json [--apply]",
  );
}

const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
const sourceSystem = flag("--source-system") ?? "courselit-mongo";
const client = new Pool({ connectionString: databaseUrl });
try {
  const db = drizzle(client, { schema });
  const result = await importLegacyPaymentPlans(db, {
    plans: readLegacyPaymentPlanExport(inputPath),
    courses: readLegacyProductExport(productsPath).courses,
    clock: systemClock,
    mode,
    sourceSystem,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.counts.rejected > 0) process.exitCode = 2;
} finally {
  await client.end();
}
