import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@codelitdev/design-system",
    "@courselit/page-blocks",
    "@frontlit/page-builder",
  ],
};

export default nextConfig;
