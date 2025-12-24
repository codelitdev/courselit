import sharedConfig from "tailwind-config/tailwind.config";

const config = {
    presets: [sharedConfig],
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}",
        "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
        "./ui-config/**/*.{js,ts,jsx,tsx,mdx}",
        "../../packages/components-library/src/**/*.{js,ts,jsx,tsx}",
    ],
};
export default config;
