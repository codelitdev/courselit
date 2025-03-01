import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
    treeshake: true,
    splitting: true,
    entry: ["src/**/*.tsx"],
    format: ["esm"],
    dts: true,
    minify: true,
    clean: true,
    external: ["react", "react-dom", "next/script", "lucide-react"],
    ...options,
}));
