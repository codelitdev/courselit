const graphql = require('graphql')

const settingsType = new graphql.GraphQLObjectType({
  name: 'Settings',
  fields: {
    stripeSecret: { type: graphql.GraphQLString },
    paytmSecret: { type: graphql.GraphQLString },
    paypalSecret: { type: graphql.GraphQLString }
  }
})

const settingsUpdateType = new graphql.GraphQLInputObjectType({
  name: 'SettingsUpdate',
  fields: {
    stripeSecret: { type: graphql.GraphQLString },
    paytmSecret: { type: graphql.GraphQLString },
    paypalSecret: { type: graphql.GraphQLString }
  }
})

module.exports = {
  settingsType,
  settingsUpdateType
}
