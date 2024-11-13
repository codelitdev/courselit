const sharedConfig = require("tailwind-config/tailwind.config.js");

module.exports = {
    presets: [sharedConfig],
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
};
