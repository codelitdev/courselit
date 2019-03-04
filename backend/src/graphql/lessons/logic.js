/**
 * Business logic for managing lessons
 */
const Lesson = require('../../models/User.js')
const strings = require('../../config/strings.js')

exports.getLesson = async (id, ctx) => {
  // const loggedUserEmail = ctx.user && ctx.user.email

  const lesson = await Lesson.findById(id)

  return lesson
}

exports.createLesson = async (lessonData, ctx) => {
  const loggedUserEmail = ctx.user && ctx.user.email

  if (!loggedUserEmail) throw new Error(strings.responses.request_not_authenticated)

  console.log(lessonData)

  return null
}