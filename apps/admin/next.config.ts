import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@codelitdev/design-system",
    "@courselit/components-library",
    "@courselit/page-blocks",
  ],
};

export default nextConfig;
