import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
    treeshake: true,
    splitting: true,
    entry: ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/__tests__/**/*.ts"],
    format: ["esm"],
    dts: true,
    minify: true,
    clean: true,
    ...options,
}));
