const graphql = require('graphql')
const queryType = require('./types.js')

module.exports = new graphql.GraphQLSchema({
  query: queryType
})
