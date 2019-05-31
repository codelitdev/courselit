const graphql = require('graphql')

const creatorMediaType = new graphql.GraphQLObjectType({
  name: 'CreatorMedia',
  fields: {
    id: { type: graphql.GraphQLID },
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    originalFileName: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    mimeType: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    size: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) },
    altText: { type: graphql.GraphQLString }
  }
})

module.exports = {
  creatorMediaType
}
