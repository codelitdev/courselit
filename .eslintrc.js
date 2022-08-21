module.exports = {
    "env": {
      "node": true,
      "jest": true
    },
    "plugins": ["unused-imports"],
    "rules": {
      "no-console": ["error", {"allow": ["warn", "error"]}],
      "unused-imports/no-unused-imports": "error"
    }
  };