const { defineConfig, globalIgnores } = require("eslint/config");

const globals = require("globals");
const unusedImports = require("eslint-plugin-unused-imports");
const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");

const nextConfigs = nextCoreWebVitals.map((config) => ({
    ...config,
    files: ["apps/web/**/*.{js,jsx,ts,tsx}"],
}));

const [nextConfig, ...restNextConfigs] = nextConfigs;

nextConfig.settings = {
    ...(nextConfig.settings ?? {}),
    react: {
        version: "detect",
    },
    next: {
        ...((nextConfig.settings ?? {}).next ?? {}),
        rootDir: ["apps/web/"],
    },
};

module.exports = defineConfig([
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },

        plugins: {
            "unused-imports": unusedImports,
        },

        rules: {
            "no-console": [
                "error",
                {
                    allow: ["warn", "error"],
                },
            ],

            "unused-imports/no-unused-imports": "error",
            "@typescript-eslint/ban-ts-comment": "off",
        },
    },
    nextConfig,
    ...restNextConfigs,
    globalIgnores([
        "**/node_modules/",
        "**/dist/",
        "apps/web/.next/",
        "apps/web/.migrations/",
    ]),
]);
