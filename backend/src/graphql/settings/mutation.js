const graphql = require('graphql')
const types = require('./types.js')
const logic = require('./logic.js')

module.exports = {
  updateSettings: {
    type: types.settingsType,
    args: {
      settingsData: {
        type: new graphql.GraphQLNonNull(types.settingsUpdateType)
      }
    },
    resolve: async (root, { settingsData }, context) =>
      logic.updateSettings(settingsData, context)
  }
}
