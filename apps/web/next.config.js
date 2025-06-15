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
    reactStrictMode: true,
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns,
    },
    transpilePackages: [
        "@courselit/common-widgets",
        "@courselit/components-library",
    ],
    serverExternalPackages: [
        "pug",
        "liquidjs",
        "mongoose",
        "mongodb",
    ],
};

module.exports = nextConfig;
