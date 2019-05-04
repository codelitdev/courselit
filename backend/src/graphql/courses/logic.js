/**
 * Business logic for managing courses.
 */
const Course = require('../../models/Course.js')
const strings = require('../../config/strings.js')
const {
  checkIfAuthenticated,
  checkOwnership
} = require('../../lib/graphql.js')
const {
  closed
} = require('../../config/constants.js')

const checkCourseOwnership = checkOwnership(Course)

exports.getCourse = async (id, ctx) => {
  const course = await Course.findById(id)

  // If the accessor is not the owner hide certain details or the entire course
  if (course &&
    (
      !ctx.user ||
      (course.creatorId.toString() !== ctx.user._id.toString())
    )
  ) {
    if (!course.published || course.privacy === closed) {
      throw new Error(strings.responses.item_not_found)
    }
  }

  return course
}

exports.createCourse = async (courseData, ctx) => {
  checkIfAuthenticated(ctx)

  if (ctx.user.isCreator === undefined ||
    !ctx.user.isCreator) {
    throw new Error(strings.responses.not_a_creator)
  }

  const course = await Course.create({
    title: courseData.title,
    cost: courseData.cost,
    published: courseData.published,
    privacy: courseData.privacy,
    isBlog: courseData.isBlog,
    description: courseData.description,
    featuredImage: courseData.featuredImage,
    creatorId: ctx.user._id
  })

  return course
}

exports.updateCourse = async (courseData, ctx) => {
  checkIfAuthenticated(ctx)
  let course = await checkCourseOwnership(courseData.id, ctx)

  for (let key of Object.keys(courseData)) {
    course[key] = courseData[key]
  }

  course = await course.save()
  return course
}

exports.deleteCourse = async (id, ctx) => {
  checkIfAuthenticated(ctx)
  let course = await checkCourseOwnership(id, ctx)

  if (course.lessons.length > 0) {
    throw new Error(strings.responses.course_not_empty)
  }

  try {
    await course.remove()
    return true
  } catch (err) {
    throw new Error(err.message)
  }
}

exports.addLesson = async (courseId, lessonId, ctx) => {
  checkIfAuthenticated(ctx)
  let course = await checkCourseOwnership(courseId, ctx)
  if (course.lessons.indexOf(lessonId) === -1) {
    course.lessons.push(lessonId)
  }

  try {
    await course.save()
  } catch (err) {
    return false
  }

  return true
}

exports.removeLesson = async (courseId, lessonId, ctx) => {
  checkIfAuthenticated(ctx)
  let course = await checkCourseOwnership(courseId, ctx)
  if (~course.lessons.indexOf(lessonId)) {
    course.lessons.splice(course.lessons.indexOf(lessonId), 1)
  }

  try {
    await course.save()
  } catch (err) {
    return false
  }

  return true
}
