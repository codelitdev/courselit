const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  mode: "production",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "umd",
    library: "@courselit/components-library",
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
    "react-redux": "react-redux",
    "@material-ui/styles": "@material-ui/styles",
  },
};
