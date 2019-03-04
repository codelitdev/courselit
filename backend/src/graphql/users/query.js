const graphql = require('graphql')
const types = require('./types.js')
const logic = require('./logic.js')

module.exports = {
  getUser: {
    type: types.userType,
    args: {
      email: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) }
    },
    resolve: (root, { email }, context) => logic.getUser(email, context)
  }
}
