const graphql = require('graphql')

const userType = new graphql.GraphQLObjectType({
  name: 'User',
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    email: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    verified: { type: graphql.GraphQLBoolean },
    name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    purchases: {
      type: new graphql.GraphQLList(
        new graphql.GraphQLNonNull(graphql.GraphQLID)
      )
    },
    isCreator: { type: graphql.GraphQLBoolean },
    isAdmin: { type: graphql.GraphQLBoolean },
    avatar: { type: graphql.GraphQLString }
  }
})

const userUpdateInput = new graphql.GraphQLInputObjectType({
  name: 'UserUpdateInput',
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    name: { type: graphql.GraphQLString },
    avatar: { type: graphql.GraphQLString },
    isCreator: { type: graphql.GraphQLBoolean },
    isAdmin: { type: graphql.GraphQLBoolean }
  }
})

const userSearchInput = new graphql.GraphQLInputObjectType({
  name: 'UserSearchInput',
  fields: {
    searchText: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    offset: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) }
  }
})

module.exports = {
  userType,
  userUpdateInput,
  userSearchInput
}
