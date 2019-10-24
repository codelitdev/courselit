const graphql = require('graphql')

const users = require('./users')
const lessons = require('./lessons')
const courses = require('./courses')
const siteinfo = require('./siteinfo')
const media = require('./media')

module.exports = new graphql.GraphQLSchema({
  query: new graphql.GraphQLObjectType({
    name: 'RootQuery',
    fields: {
      ...users.queries,
      ...lessons.queries,
      ...courses.queries,
      ...siteinfo.queries,
      ...media.queries
    }
  }),
  mutation: new graphql.GraphQLObjectType({
    name: 'RootMutation',
    fields: {
      ...users.mutations,
      ...lessons.mutations,
      ...courses.mutations,
      ...siteinfo.mutations
    }
  })
})
