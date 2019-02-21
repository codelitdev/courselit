const graphql = require('graphql')
const User = require('../../models/User.js')

const userType = new graphql.GraphQLObjectType({
  name: 'User',
  fields: {
    email: { type: graphql.GraphQLString },
    verified: { type: graphql.GraphQLBoolean },
    name: { type: graphql.GraphQLString }
  }
})

const queryType = new graphql.GraphQLObjectType({
  name: 'Query',
  fields: {
    user: {
      type: userType,
      args: {
        email: { type: graphql.GraphQLString }
      },
      resolve: async (root, { email }) => {
        const user = await User.findOne({ email })
        console.log(JSON.parse(JSON.stringify(user)))
        return JSON.parse(JSON.stringify(user))
        // return user
      }
    }
  }
})

module.exports = queryType
