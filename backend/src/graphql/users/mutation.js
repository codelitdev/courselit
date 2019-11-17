const graphql = require('graphql')
const types = require('./types.js')
const logic = require('./logic.js')

module.exports = {
  // updateName: {
  //   type: types.userType,
  //   args: {
  //     name: {
  //       type: new graphql.GraphQLNonNull(graphql.GraphQLString)
  //     }
  //   },
  //   resolve: async (root, { name }, context) => logic.updateName(name, context)
  // },
  updateUser: {
    type: types.userType,
    args: {
      userData: {
        type: new graphql.GraphQLNonNull(types.userUpdateInput)
      }
    },
    resolve: async (root, { userData }, context) =>
      logic.updateUser(userData, context)
  }
}
