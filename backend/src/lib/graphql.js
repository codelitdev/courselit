/**
 * Utility functions related to GraphQL API.
 */
const strings = require('../config/strings.js')

/**
 * Helper function for checking authenticated requests.
 *
 * @param {Object} ctx context received from the GraphQL resolver
 */
exports.checkIfAuthenticated = (ctx) => {
  if (!ctx.user) throw new Error(strings.responses.request_not_authenticated)
}

/**
 * Helper function for checking the ownership of the item based on creatorId field.
 *
 * @param {Object} Model Mongoose Schema
 * @param {ObjectId} id MongoDB ObjectId for the item
 * @param {Object} ctx context received from the GraphQL resolver
 */
exports.checkOwnership = (Model) => async (id, ctx) => {
  const item = await Model.findOne({ _id: id })
  if (!item || (item.creatorId.toString() !== ctx.user._id.toString())) {
    throw new Error(strings.responses.item_not_found)
  }

  return item
}

/**
 * A helper function to validate page offsets.
 *
 * @param {number} offset Number of pages to skip
 */
exports.validateOffset = (offset) => {
  if (offset < 1) throw new Error(strings.responses.invalid_offset)
}
