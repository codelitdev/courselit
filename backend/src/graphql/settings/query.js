const types = require('./types.js')
const logic = require('./logic.js')

module.exports = {
  getSettings: {
    type: types.settingsType,
    resolve: (root, _, context) => logic.getSettings(context)
  }
}
