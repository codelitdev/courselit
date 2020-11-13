const path = require("path");

module.exports = {
  entry: "./src/index.js",
  mode: "production",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "umd",
    library: "@courselit/widget-buttondown",
    globalObject: "this",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
    ],
  },
  externals: {
    react: "react",
    "react-dom": "react-dom",
    "react-redux": "react-redux",
    "prop-types": "prop-types",
    "@material-ui/core": "@material-ui/core",
    "@material-ui/styles": "@material-ui/styles",
  },
};
