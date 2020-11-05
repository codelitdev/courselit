module.exports = {
  extends: ["standard", "plugin:react/recommended", "prettier"],
  plugins: ["react-hooks"],
  ignorePatterns: ["dist/*.js"],
  rules: {
    "react-hooks/rules-of-hooks": "error",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
