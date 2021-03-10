const schema = require("../graphql/schema.js");

module.exports = (req) => ({
  schema,
  context: { user: req.user, domain: req.domain },
  graphiql: process.env.NODE_ENV === "dev",
});
