const graphql = require('graphql')

const siteType = new graphql.GraphQLObjectType({
  name: 'Site',
  fields: {
    title: { type: graphql.GraphQLString },
    subtitle: { type: graphql.GraphQLString },
    logopath: { type: graphql.GraphQLString }
  }
})

const siteUpdateType = new graphql.GraphQLInputObjectType({
  name: 'SiteInfoUpdateInput',
  fields: {
    title: { type: graphql.GraphQLString },
    subtitle: { type: graphql.GraphQLString },
    logopath: { type: graphql.GraphQLString }
  }
})

module.exports = {
  siteType,
  siteUpdateType
}
