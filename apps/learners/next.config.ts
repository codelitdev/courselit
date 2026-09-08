import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@codelitdev/design-system",
    "@frontlit/page-builder",
    "@courselit/components-library",
  ],
};

export default nextConfig;
