import { readFileSync } from "node:fs";
import { systemClock } from "@codelitdev/platform";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema/index.ts";
import {
  importLegacyProducts,
  readLegacyProductExport,
} from "../src/migrations/products.ts";

function flag(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

const inputPath = flag("--input");
const lessonsPath = flag("--lessons");
const databaseUrl = process.env.DATABASE_URL;
if (!inputPath || !databaseUrl) {
  throw new Error(
    "usage: DATABASE_URL=... bun scripts/import-products.mjs --input products.json [--lessons lessons.json] [--apply]",
  );
}

const exportData = readLegacyProductExport(inputPath);
const lessons = lessonsPath
  ? (() => {
      const parsed = JSON.parse(readFileSync(lessonsPath, "utf8"));
      if (!Array.isArray(parsed)) {
        throw new Error("lesson_export_must_be_an_array");
      }
      return parsed;
    })()
  : exportData.lessons;
const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
const sourceSystem = flag("--source-system") ?? "courselit-mongo";
const client = new Pool({ connectionString: databaseUrl });
try {
  const db = drizzle(client, { schema });
  const result = await importLegacyProducts(db, {
    courses: exportData.courses,
    lessons,
    clock: systemClock,
    mode,
    sourceSystem,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.counts.rejected > 0) process.exitCode = 2;
} finally {
  await client.end();
}
