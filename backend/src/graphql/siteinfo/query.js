// const graphql = require('graphql')
const types = require('./types.js')
const logic = require('./logic.js')

module.exports = {
  getSiteInfo: {
    type: types.siteType,
    resolve: (root, { x }, context) => logic.getSiteInfo()
  }
}
