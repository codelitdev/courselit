import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openapiSpec } from "./spec.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(currentDir, "generated");
const outputFile = path.join(outputDir, "openapi.json");
const tempFile = path.join(outputDir, `openapi.${process.pid}.tmp`);

await mkdir(outputDir, { recursive: true });
await writeFile(tempFile, `${JSON.stringify(openapiSpec, null, 2)}\n`, {
  mode: 0o600,
});
await rename(tempFile, outputFile);

// eslint-disable-next-line no-console
console.info(`OpenAPI spec written to ${outputFile}`);
