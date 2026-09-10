import path from "node:path";
import { fileURLToPath } from "node:url";

export const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../drizzle",
);
