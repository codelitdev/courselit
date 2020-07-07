const path = require('path')

module.exports = {
    mode: 'production',
    entry: './lib/react-template-layout.js',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'react-template-layout.js',
        library: 'ReactTemplateLayout',
        libraryTarget: 'commonjs2'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-react']
                    }
                }
            }
        ]
    },
    externals: {
        react: "react"
    }
}