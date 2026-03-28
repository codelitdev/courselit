import type { Config } from "tailwindcss";
import sharedConfig from "tailwind-config";

const config = {
    presets: [sharedConfig as Config],
};
export default config;
