import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const basePath = rawBasePath === "/" ? "" : rawBasePath;

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
};

export default withMDX(nextConfig);
