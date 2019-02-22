const graphql = require('graphql')

const root = {
  user: function(args, req) {
    return JSON.stringify(req.user)
  }
}

module.exports = graphql.buildSchema(`
  type Query {
    user: String
  }
`)