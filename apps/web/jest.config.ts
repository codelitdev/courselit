import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({
    dir: "./apps/web",
});

const config: Config = {
    coverageProvider: "v8",
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/setupTests.ts"],
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
        nanoid: "<rootDir>/__mocks__/nanoid.ts",
        slugify: "<rootDir>/__mocks__/slugify.ts",
        "@models/(.*)": "<rootDir>/models/$1",
        "@/auth": "<rootDir>/auth.ts",
    },
};

export default createJestConfig(config);
