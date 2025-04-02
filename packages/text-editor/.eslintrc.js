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
    ignorePatterns: ["dist/**"],
    rules: {
        "react-hooks/rules-of-hooks": "error",
        "@typescript-eslint/ban-ts-comment": "off",
    },
    settings: {
        react: {
            version: "detect",
        },
    },
};
