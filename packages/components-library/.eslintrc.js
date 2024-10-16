module.exports = {
    env: {
        browser: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react/recommended",
        "prettier",
    ],
    plugins: ["react-hooks"],
    ignorePatterns: ["src/components/ui/**", "dist/**", "tailwind.config.js"],
    rules: {
        "react/react-in-jsx-scope": "off",
        "react-hooks/rules-of-hooks": "error",
        "@typescript-eslint/no-explicit-any": "warn",
        "react/display-name": "off",
    },
    settings: {
        react: {
            version: "detect",
        },
    },
};
