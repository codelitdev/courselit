const graphql = require('graphql')
const types = require('./types.js')
const logic = require('./logic.js')

module.exports = {
  getCourse: {
    type: types.courseType,
    args: {
      id: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
      }
    },
    resolve: (root, { id }, context) =>
      logic.getCourse(id, context)
  }
}
