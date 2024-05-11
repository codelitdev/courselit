/** @type {import('next').NextConfig} */

const remotePatterns = [
    {
        protocol: "https",
        hostname: "medialit-prod.s3.ap-southeast-1.amazonaws.com",
    },
];

if (process.env.MEDIALIT_SERVER && process.env.MEDIALIT_CDN) {
    for (const hostname of process.env.MEDIALIT_CDN.split(",")) {
        remotePatterns.push({
            hostname: hostname.trim(),
        });
    }
}

const nextConfig = {
    reactStrictMode: true,
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns,
    },
};

module.exports = nextConfig;
