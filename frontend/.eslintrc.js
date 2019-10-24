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
    },
    overrides: [
        {
            files: ['pages/**/*.js'],
            rules: {
                "react/react-in-jsx-scope": "off",
                "react/prop-types": "off"
            }
        }
    ]
};