import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({
    dir: "./apps/web",
});

const config: Config = {
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/setupTests.client.ts"],
    watchPathIgnorePatterns: ["globalConfig"],
    testPathIgnorePatterns: [
        "/node_modules/",
        "/.next/",
        // Exclude MongoDB tests - they will be handled by the MongoDB config
        ".*/graphql/.*/__tests__/.*\\.test\\.(ts|tsx)$",
        ".*/api/.*/__tests__/.*\\.test\\.(ts|tsx)$",
    ],
    // collectCoverage: true,
    // collectCoverageFrom: [
    //     '**/*.{js,jsx,ts,tsx}',
    //     '!**/*.d.ts',
    //     '!**/node_modules/**',
    //     '!**/.next/**',
    //     '!**/coverage/**',
    //     '!**/jest.config.ts',
    //     '!**/setupTests.ts',
    // ],
    globalSetup: "<rootDir>/jest.setup.ts",
    globalTeardown: "<rootDir>/jest.teardown.ts",
    moduleNameMapper: {
        "next-auth": "<rootDir>/__mocks__/next-auth.ts",
        "@courselit/utils": "<rootDir>/../../packages/utils/src",
        "@courselit/common-logic": "<rootDir>/../../packages/common-logic/src",
        "@courselit/page-primitives":
            "<rootDir>/../../packages/page-primitives/src",
        nanoid: "<rootDir>/__mocks__/nanoid.ts",
        slugify: "<rootDir>/__mocks__/slugify.ts",
        "@models/(.*)": "<rootDir>/models/$1",
        "@/auth": "<rootDir>/auth.ts",
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
    testMatch: ["**/__tests__/**/*.(test|spec).(ts|tsx|js)"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};

export default createJestConfig(config);
