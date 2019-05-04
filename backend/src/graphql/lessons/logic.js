/**
 * Business logic for managing lessons
 */
const slugify = require('slugify')
const {
  text,
  audio,
  video,
  pdf
} = require('../../config/constants.js')
const Lesson = require('../../models/Lesson.js')
const strings = require('../../config/strings.js')
const {
  checkIfAuthenticated,
  checkOwnership
} = require('../../lib/graphql.js')
const {
  addLesson
} = require('../courses/logic.js')
const Course = require('../../models/Course.js')

const checkLessonOwnership = checkOwnership(Lesson)

/**
 * Helper function to validate the lesson data for storing.
 *
 * @param {Object} lessonData
 */
const lessonValidator = (lessonData) => {
  if (lessonData.type === text && !lessonData.content) {
    throw new Error(strings.responses.content_cannot_be_null)
  }

  if ((lessonData.type === audio ||
        lessonData.type === video ||
        lessonData.type === pdf) &&
      !lessonData.contentURL) {
    throw new Error(strings.responses.content_url_cannot_be_null)
  }
}

exports.getLesson = async (id, ctx) => {
  const lesson = await Lesson.findById(id)
  return lesson
}

exports.createLesson = async (lessonData, ctx) => {
  checkIfAuthenticated(ctx)

  lessonValidator(lessonData)

  const course = await Course.findById(lessonData.courseId)
  if (!course) {
    throw new Error(strings.responses.item_not_found)
  }

  try {
    const lesson = await Lesson.create({
      title: lessonData.title,
      slug: slugify(lessonData.title.toLowerCase()),
      type: lessonData.type,
      content: lessonData.content,
      contentURL: lessonData.contentURL,
      downloadable: lessonData.downloadable,
      creatorId: ctx.user._id
    })

    // add the lesson to the course
    course.lessons.push(lesson.id)
    await course.save()

    return lesson
  } catch (err) {
    throw new Error(err.message)
  }
}

exports.deleteLesson = async (id, ctx) => {
  checkIfAuthenticated(ctx)
  const lesson = await checkLessonOwnership(id, ctx)

  try {
    // remove from the parent Course's lessons array
    let course = await Course.find().elemMatch('lessons', { '$eq': lesson.id })
    course = course[0]
    if (~course.lessons.indexOf(lesson.id)) {
      course.lessons.splice(course.lessons.indexOf(lesson.id), 1)
    }
    await course.save()

    await lesson.remove()
    return true
  } catch (err) {
    throw new Error(err.message)
  }
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

exports.updateLesson = async (lessonData, ctx) => {
  checkIfAuthenticated(ctx)
  let lesson = await checkLessonOwnership(lessonData.id, ctx)

  lessonValidator(lessonData)

  for (let key of Object.keys(lessonData)) {
    lesson[key] = lessonData[key]
  }

  lesson = await lesson.save()
  return lesson
}