import type { Config } from "jest";

const config: Config = {
    preset: "@shelf/jest-mongodb",
    setupFilesAfterEnv: ["<rootDir>/setupTests.server.ts"],
    watchPathIgnorePatterns: ["globalConfig"],
    moduleNameMapper: {
        "@courselit/utils": "<rootDir>/../../packages/utils/src",
        "@/payments-new": "<rootDir>/payments-new",
        "@/graphql/(.*)": "<rootDir>/graphql/$1",
        "@/config/(.*)": "<rootDir>/config/$1",
        "@/lib/(.*)": "<rootDir>/lib/$1",
        "@/services/(.*)": "<rootDir>/services/$1",
        "@/templates/(.*)": "<rootDir>/templates/$1",
        "@/app/(.*)": "<rootDir>/app/$1",
        "@ui-lib/(.*)": "<rootDir>/ui-lib/$1",
        "@config/(.*)": "<rootDir>/config/$1",
        "@/models/(.*)": "<rootDir>/models/$1",
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    },
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
    testMatch: [
        "**/graphql/**/__tests__/**/*.test.ts",
        "**/api/**/__tests__/**/*.test.ts",
    ],
    testPathIgnorePatterns: [
        "/node_modules/",
        "/.next/",
        // Exclude component tests - they should run in the regular config
        ".*/components/.*/__tests__/.*\\.test\\.(tsx|ts)$",
    ],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};

export default config;
