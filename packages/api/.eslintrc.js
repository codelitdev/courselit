module.exports = {
  extends: ["standard", "prettier"],
  env: {
    node: true,
    jest: true,
  },
  globals: {
    apiUrl: true,
  },
  rules: {
    "no-console": ["error", { allow: ["warn", "error", "info"] }],
  },
};
