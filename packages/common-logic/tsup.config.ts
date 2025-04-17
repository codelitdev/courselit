import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
    treeshake: true,
    splitting: true,
    entry: ["src/**/*.ts"],
    format: ["esm"],
    dts: true,
    minify: true,
    clean: true,
    external: ["mongoose"],
    esbuildOptions(options) {
        options.target = "es2017";
        options.platform = "node";
        return options;
    },
    ...options,
}));
