const HttpError = require("../lib/HttpError.js");
const schema = require("./schema.js");

module.exports = (req) => ({
  schema,
  context: { user: req.user, domain: req.domain },
  graphiql: process.env.NODE_ENV === "dev",
  customFormatErrorFn: (err) => {
    return {
      message: err.message,
      statusCode:
        err.originalError instanceof HttpError
          ? err.originalError.statusCode
          : undefined,
    };
  },
});
