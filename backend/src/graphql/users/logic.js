/**
 * Business logic for managing users.
 */
const User = require('../../models/User.js')
const strings = require('../../config/strings.js')
const {
  checkIfAuthenticated,
  checkAdminOrSelf,
  checkIfItemExists
} = require('../../lib/graphql.js')

exports.getUser = async (email, ctx) => {
  const loggedUserEmail = ctx.user && ctx.user.email
  const isAdmin = ctx.user && ctx.user.isAdmin

  const user = await User.findOne({ email })

  if (!user) {
    throw new Error(strings.responses.item_not_found)
  }

  const result = (loggedUserEmail === email || isAdmin)
    ? user
    : (({ id, email, name }) => ({ id, email, name }))(user)

  return result
}

exports.updateName = async (name, ctx) => {
  checkIfAuthenticated(ctx)
  ctx.user.name = name
  await ctx.user.save()
  return ctx.user
}

exports.updateUser = async (userData, ctx) => {
  checkIfAuthenticated(ctx)
  const { id } = userData
  let user = await checkIfItemExists(User, id)
  checkAdminOrSelf(id, ctx)

  for (let key of Object.keys(userData)) {
    if (key === 'id') { continue }
    if (~['isCreator', 'isAdmin'].indexOf(key)) {
      if (ctx.user.isAdmin) {
        user[key] = userData[key]
      } 
      continue
    }
    user[key] = userData[key]
  }

  if (!user.name) {
    throw new Error(strings.responses.user_name_cant_be_null)
  }

  user = await user.save()
  return user
}

exports.searchUser = async (searchData, ctx) => {
  const query = {}
  if (text) query['$text'] = { $search: searchData.searchText }

  const searchMedia = makeModelTextSearchable(Media)

  return await searchMedia(
    { offset: searchData.offset, query, graphQLContext: ctx }, 
    { itemsPerPage: mymediaLimit }
  )
}
