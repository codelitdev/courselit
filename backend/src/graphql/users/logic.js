/**
 * Business logic for managing users.
 */
const User = require('../../models/User.js')
const strings = require('../../config/strings.js')

exports.getUser = async (email, ctx) => {
  const loggedUserEmail = ctx.user && ctx.user.email

  const user = await User.findOne({ email })

  const result = loggedUserEmail === email
    ? user
    : (({ id, email, name }) => ({ id, email, name }))(user)

  return result
}

exports.updateName = async (name, ctx) => {
  const email = ctx.user && ctx.user.email

  if (!email) {
    throw new Error(strings.responses.request_not_authenticated)
  }

  // const user = await User.findOne({ email })
  // if (!user) {
  //   throw new Error(strings.responses.user_not_found)
  // }

  // user.name = name
  // await user.save()
  ctx.user.name = name
  await ctx.user.save()
  return ctx.user
}
