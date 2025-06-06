import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
    treeshake: true,
    splitting: true,
    entry: ["src/**/*.tsx", "src/**/*.ts"],
    format: ["esm"],
    dts: true,
    minify: true,
    clean: true,
    external: ["react", "react/jsx-runtime"],
    esbuildOptions(options) {
        options.jsx = "automatic";
        return options;
    },
    ...options,
}));
