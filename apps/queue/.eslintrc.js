module.exports = {
    env: {
        node: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
    ],
    ignorePatterns: ["dist/**/*.js"],
    rules: {
        "@typescript-eslint/ban-ts-comment": "off",
    },
};
