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