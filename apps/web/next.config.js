/** @type {import('next').NextConfig} */

const remotePatterns = [
    {
        protocol: "https",
        hostname: "**",
    },
];

const nextConfig = {
    output: "standalone",
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
    experimental: {
        serverComponentsExternalPackages: ["pug"],
    },
};

module.exports = nextConfig;
