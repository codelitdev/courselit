const graphql = require('graphql')

const users = require('./users')
const lessons = require('./lessons')
const courses = require('./courses')

module.exports = new graphql.GraphQLSchema({
  query: new graphql.GraphQLObjectType({
    name: 'RootQuery',
    fields: {
      ...users.queries,
      ...lessons.queries,
      ...courses.queries
    }
  }),
  mutation: new graphql.GraphQLObjectType({
    name: 'RootMutation',
    fields: {
      ...users.mutations,
      ...lessons.mutations,
      ...courses.mutations
    }
  })
})
