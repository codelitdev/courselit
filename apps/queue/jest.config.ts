const config = {
    preset: "@shelf/jest-mongodb",
    setupFilesAfterEnv: ["<rootDir>/setupTests.ts"],
    watchPathIgnorePatterns: ["globalConfig"],
    moduleNameMapper: {
        "@courselit/utils": "<rootDir>/../../packages/utils/src",
        "@courselit/common-logic": "<rootDir>/../../packages/common-logic/src",
        "@courselit/common-models":
            "<rootDir>/../../packages/common-models/src",
        "@courselit/email-editor":
            "<rootDir>/__mocks__/@courselit/email-editor.ts",
        nanoid: "<rootDir>/__mocks__/nanoid.ts",
        "@sindresorhus/slugify": "<rootDir>/__mocks__/slugify.ts",
        // Handle @/ paths - prioritize email-editor package paths, then queue app paths
        // These must come before the generic @/ pattern
        "^@/components/ui/(.*)$":
            "<rootDir>/../../packages/email-editor/src/components/ui/$1",
        "^@/components/settings/(.*)$":
            "<rootDir>/__mocks__/settings-components.tsx",
        "^@/components/(.*)$":
            "<rootDir>/../../packages/email-editor/src/components/$1",
        "^@/lib/(.*)$": "<rootDir>/../../packages/email-editor/src/lib/$1",
        "^@/blocks$": "<rootDir>/../../packages/email-editor/src/blocks",
        "^@/blocks/(.*)$":
            "<rootDir>/../../packages/email-editor/src/blocks/$1",
        "^@/types/(.*)$": "<rootDir>/../../packages/email-editor/src/types/$1",
        "^@/(.*)$": "<rootDir>/src/$1",
        // Mock React UI components and dependencies that aren't available in Node.js
        "^@radix-ui/(.*)$": "<rootDir>/__mocks__/radix-ui.ts",
        "^lucide-react$": "<rootDir>/__mocks__/lucide-react.ts",
        // Mock CSS imports
        "\\.css$": "<rootDir>/__mocks__/css.ts",
    },
    transformIgnorePatterns: ["node_modules/(?!(nanoid)/)"],
    extensionsToTreatAsEsm: [],
    transform: {
        "^.+\\.(ts|tsx)$": [
            "ts-jest",
            {
                tsconfig: {
                    jsx: "react-jsx",
                },
            },
        ],
    },
    testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
    testPathIgnorePatterns: ["/node_modules/", "/dist/"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    testEnvironment: "node",
};

export default config;
