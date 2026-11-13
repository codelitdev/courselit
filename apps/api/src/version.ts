import { readFileSync } from "node:fs";

/** The API's version, from its package.json (shipped next to src/ in the image). */
export const API_VERSION: string = (() => {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { version?: unknown };
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
})();
