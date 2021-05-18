"use strict";

const express = require("express");
const passport = require("passport");
const { graphqlHTTP } = require("express-graphql");
const fileUpload = require("express-fileupload");
const optionalAuthMiddlewareCreator = require("./middlewares/optionalAuth.js");
const {
  routePrefix,
  uploadFolder,
  useCloudStorage,
  tempFileDirForUploads,
} = require("./config/constants.js");
const verifyDomain = require("./middlewares/verifyDomain.js");
const asyncHandler = require("./lib/utils.js").asyncHandler;
const graphql = require("./graphql");

require("./middlewares/passport.js")(passport);
require("./config/db.js")();

const app = express();

// Middlewares
if (process.env.NODE_ENV !== "production") {
  app.use(require("cors")());
}
app.use(passport.initialize());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: tempFileDirForUploads,
  })
);
app.use(asyncHandler(verifyDomain));

// Routes
if (!useCloudStorage) {
  app.use(`${routePrefix}/assets`, express.static(uploadFolder));
}
app.use(`${routePrefix}/auth`, require("./routes/auth.js")(passport));
app.use(
  `${routePrefix}/graph`,
  optionalAuthMiddlewareCreator(passport),
  graphqlHTTP(graphql)
);
app.use(`${routePrefix}/media`, require("./routes/media")(passport));
app.use(`${routePrefix}/payment`, require("./routes/payment.js")(passport));

module.exports = app;
