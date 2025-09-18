/** @type {import('next').NextConfig} */

const { version } = require("./package.json");

const remotePatterns = [
    {
        protocol: "https",
        hostname: "**",
    },
];

const nextConfig = {
    output: "standalone",
    env: {
        version,
    },
    reactStrictMode: false,
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns,
    },
    transpilePackages: [
        "@courselit/page-blocks",
        "@courselit/components-library",
    ],
    serverExternalPackages: ["pug", "liquidjs", "mongoose", "mongodb"],
    experimental: {},
};

module.exports = nextConfig;
