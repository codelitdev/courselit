/**
 * Bussiness logic for managing media
 */
const Media = require('../../models/Media.js')
const {
  checkIfAuthenticated,
  validateOffset
} = require('../../lib/graphql.js')
const {
  mymediaLimit
} = require('../../config/constants.js')

exports.getCreatorMedia = async (offset, ctx, searchText) => {
  checkIfAuthenticated(ctx)
  validateOffset(offset)

  const query = {
    creatorId: ctx.user._id
  }
  if (searchText) query['$text'] = { $search: searchText }
  let media = await Media.find(query).skip((offset - 1) * mymediaLimit).limit(mymediaLimit)

  return media
}
