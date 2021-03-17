"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const passport = require("passport");
const graphqlHTTP = require("express-graphql");
const fileUpload = require("express-fileupload");
const optionalAuthMiddlewareCreator = require("./middlewares/optionalAuth.js");
const { routePrefix } = require("./config/constants.js");
const verifyDomain = require("./middlewares/verifyDomain.js");
const asyncHandler = require("./lib/utils.js").asyncHandler;
const graphql = require("./middlewares/graphql.js");

require("./middlewares/passport.js")(passport);
require("./config/db.js")();

const app = express();

// Middlewares
if (process.env.NODE_ENV !== "production") {
  app.use(require("cors")());
}
app.use(passport.initialize());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(asyncHandler(verifyDomain));

// Routes
app.use(`${routePrefix}/auth`, require("./routes/auth.js")(passport));
app.use(
  `${routePrefix}/graph`,
  optionalAuthMiddlewareCreator(passport),
  graphqlHTTP(graphql)
);
app.use(`${routePrefix}/media`, require("./routes/media.js")(passport));
app.use(`${routePrefix}/payment`, require("./routes/payment.js")(passport));
app.use(`${routePrefix}/domain`, require("./routes/domain.js"));

module.exports = app;
