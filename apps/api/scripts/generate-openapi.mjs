import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createOpenApiDocument } from "../src/openapi.ts";

// The committed copy of the spec the API serves at /openapi.json, for tools
// that read the spec from the repository (the API reference in the docs).
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const specPath = path.join(root, "openapi.json");
const check = process.argv.includes("--check");

const publicApiUrl = "https://api.courselit.app";
const source = `${JSON.stringify(createOpenApiDocument(publicApiUrl), null, 2)}\n`;

let existing;
try {
  existing = readFileSync(specPath, "utf8");
} catch {
  // A missing spec is reported as drift below.
}

if (check) {
  if (existing !== source) {
    const fp = (value) => createHash("sha256").update(value).digest("hex");
    process.stderr.write(
      `openapi drift: ${specPath}\ncommitted=${existing ? fp(existing) : "missing"} generated=${fp(source)}\nRun \`bun run generate:openapi\` in apps/api and commit the result.\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`ok ${specPath}\n`);
} else if (existing !== source) {
  writeFileSync(specPath, source);
  process.stdout.write(`wrote ${specPath}\n`);
} else {
  process.stdout.write(`unchanged ${specPath}\n`);
}
