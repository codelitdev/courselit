const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  mode: "production",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "umd",
    library: "@courselit/common-widgets",
    globalObject: "this",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts"],
  },
  externals: {
    react: "react",
    "react-dom": "react-dom",
    "react-redux": "react-redux",
    "prop-types": "prop-types",
    "@material-ui/core": "@material-ui/core",
    "@material-ui/styles": "@material-ui/styles",
    "next/link": "next/link",
  },
};
