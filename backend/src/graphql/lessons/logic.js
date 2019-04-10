/**
 * Business logic for managing lessons
 */
const slugify = require('slugify')
const {
  text,
  audio,
  video,
  pdf,
  quiz
} = require('../../config/constants.js')
const Lesson = require('../../models/Lesson.js')
const strings = require('../../config/strings.js')
const {
  checkIfAuthenticated,
  checkOwnership
} = require('../../lib/graphql.js')

// /**
//  * Helper function for checking the ownership of the lesson.
//  *
//  * @param {ObjectId} id MongoDB ObjectId for the lesson
//  * @param {Object} ctx context received from the GraphQL resolver
//  */
// const checkOwnership = async (id, ctx) => {
//   const lesson = await Lesson.findOne({ _id: id })
//   if (!lesson || (lesson.creatorId.toString() !== ctx.user._id.toString())) {
//     throw new Error(strings.responses.lesson_not_found)
//   }

//   return lesson
// }

const checkLessonOwnership = checkOwnership(Lesson)

exports.getLesson = async (id, ctx) => {
  const lesson = await Lesson.findById(id)
  return lesson
}

exports.createLesson = async (lessonData, ctx) => {
  checkIfAuthenticated(ctx)

  // Form validation
  if (lessonData.type === text && !lessonData.content) {
    throw new Error(strings.responses.content_cannot_be_null)
  }

  if ((lessonData.type === audio ||
        lessonData.type === video ||
        lessonData.type === pdf) &&
      !lessonData.contentURL) {
    throw new Error(strings.responses.content_url_cannot_be_null)
  }
  // Form validation ends here

  const lesson = await Lesson.create({
    title: lessonData.title,
    slug: slugify(lessonData.title.toLowerCase()),
    type: lessonData.type,
    content: lessonData.content,
    contentURL: lessonData.contentURL,
    downloadable: lessonData.downloadable,
    creatorId: ctx.user._id
  })

  return lesson
}

exports.deleteLesson = async (id, ctx) => {
  checkIfAuthenticated(ctx)
  const lesson = await checkLessonOwnership(id, ctx)
  let result = true
  lesson.remove((err) => {
    if (err) { result = false }
  })
  return result
}

exports.changeTitle = async (id, newTitle, ctx) => {
  checkIfAuthenticated(ctx)
  let lesson = await checkLessonOwnership(id, ctx)
  lesson.title = newTitle
  lesson = await lesson.save()
  return lesson
}

exports.changeContent = async (id, content, ctx) => {
  checkIfAuthenticated(ctx)
  let lesson = await checkLessonOwnership(id, ctx)
  lesson.content = content
  lesson = await lesson.save()
  return lesson
}

exports.changeContentURL = async (id, url, ctx) => {
  checkIfAuthenticated(ctx)
  let lesson = await checkLessonOwnership(id, ctx)
  lesson.contentURL = url
  lesson = await lesson.save()
  return lesson
}

exports.changeDownloadable = async (id, flag, ctx) => {
  checkIfAuthenticated(ctx)
  let lesson = await checkLessonOwnership(id, ctx)
  lesson.downloadable = flag
  lesson = await lesson.save()
  return lesson
}