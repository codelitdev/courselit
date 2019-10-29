const graphql = require('graphql')

exports.userType = new graphql.GraphQLObjectType({
  name: 'User',
  fields: {
    id: { type: graphql.GraphQLID },
    email: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    verified: { type: graphql.GraphQLBoolean },
    name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    purchases: {
      type: new graphql.GraphQLList(
        new graphql.GraphQLNonNull(graphql.GraphQLID)
      )
    },
    isCreator: { type: graphql.GraphQLBoolean },
    isAdmin: { type: graphql.GraphQLBoolean }
  }
})
