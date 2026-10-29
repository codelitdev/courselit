import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const monorepoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const nextConfig: NextConfig = {
  output: "standalone",
  // Extra hostnames allowed to load dev assets, e.g. a tailnet name.
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: [
    "@codelitdev/design-system",
    "@courselit/components-library",
    "@courselit/page-blocks",
  ],
};

export default nextConfig;
