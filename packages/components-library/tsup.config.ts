import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
    treeshake: true,
    splitting: true,
    entry: ["src/**/*.tsx", "src/**/*.ts"],
    format: ["esm"],
    dts: true,
    minify: true,
    clean: true,
    external: ["react", "next/link", "next/legacy/image", "next/navigation"],
    ...options,
}));
