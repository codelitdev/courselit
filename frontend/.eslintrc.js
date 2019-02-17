module.exports = {
    extends: [
        "standard",
        "plugin:react/recommended"
    ],
    plugins: [
        "react-hooks"
    ],
    rules: {
        "react-hooks/rules-of-hooks": "error"
    },
    settings: {
        react: {
            version: 'detect'
        }
    }
};