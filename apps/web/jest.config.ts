import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({
    dir: "./",
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
};

export default createJestConfig(config);
