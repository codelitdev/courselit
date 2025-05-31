module.exports = {
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    env: {
        node: true,
    },
    rules: {
        "no-console": ["error", { allow: ["warn"] }],
    },
    ignorePatterns: ["dist/**/*.*"],
};
