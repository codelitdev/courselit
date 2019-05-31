/**
 * Business logic for managing courses.
 */
const slugify = require('slugify')
const Course = require('../../models/Course.js')
const strings = require('../../config/strings.js')
const {
  checkIfAuthenticated,
  checkOwnership,
  validateOffset
} = require('../../lib/graphql.js')
const {
  closed,
  open,
  mycoursesLimit,
  postsPerPageLimit,
  postDescTruncLimit,
  coursesPerPageLimit
} = require('../../config/constants.js')
// const {
//   courseType
// } = require('./types.js')

const checkCourseOwnership = checkOwnership(Course)

/**
 * A helper function to validate page offsets.
 *
 * @param {number} offset Number of pages to skip
 */
// const validateOffset = (offset) => {
//   if (offset < 1) throw new Error(strings.responses.invalid_offset)
// }

/**
 * A helper function to validate blog posts.
 *
 * @param {object} courseData
 */
const validateBlogPosts = (courseData) => {
  if (courseData.isBlog) {
    if (!courseData.description) throw new Error(strings.responses.blog_description_empty)

    courseData.cost = 0
  } else {
    // verify cost data for non-blog posts
    if (!courseData.cost) throw new Error(strings.responses.cost_not_provided)
    if (courseData.cost < 0) throw new Error(strings.responses.invalid_cost)
  }

  return courseData
}

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

  courseData = validateBlogPosts(courseData)

  const course = await Course.create({
    title: courseData.title,
    cost: courseData.cost,
    published: courseData.published,
    privacy: courseData.privacy,
    isBlog: courseData.isBlog,
    isFeatured: courseData.isFeatured,
    description: courseData.description,
    featuredImage: courseData.featuredImage,
    creatorId: ctx.user._id,
    creatorName: ctx.user.name,
    slug: slugify(courseData.title.toLowerCase())
  })

  return course
}

exports.updateCourse = async (courseData, ctx) => {
  checkIfAuthenticated(ctx)
  let course = await checkCourseOwnership(courseData.id, ctx)

  for (let key of Object.keys(courseData)) {
    course[key] = courseData[key]
  }

  course = validateBlogPosts(course)
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

/**
 * Returns courses created by a user.
 */
exports.getCreatorCourses = async (id, offset, ctx) => {
  checkIfAuthenticated(ctx)
  validateOffset(offset)

  let courses = await Course.find({
    creatorId: id
  }).skip((offset - 1) * mycoursesLimit).limit(mycoursesLimit)

  return courses
}

exports.getPosts = async (offset) => {
  validateOffset(offset)

  let posts = await Course.find({
    isBlog: true,
    published: true,
    privacy: open.toLowerCase()
  }, 'id title description creatorName updated slug')
    .skip((offset - 1) * postsPerPageLimit).limit(postsPerPageLimit)

  return posts.map(x => ({
    id: x.id,
    title: x.title,
    description: x.description.substr(0, postDescTruncLimit),
    creatorName: x.creatorName,
    updated: x.updated,
    slug: x.slug
  }))
}

exports.getPublicCourses = async (offset, onlyShowFeatured = false) => {
  const query = onlyShowFeatured ? {
    isBlog: false,
    published: true,
    privacy: open.toLowerCase(),
    isFeatured: true
  } : {
    isBlog: false,
    published: true,
    privacy: open.toLowerCase()
  }
  let courses = await Course
    .find(query, 'id title featuredImage cost')
    .skip((offset - 1) * coursesPerPageLimit).limit(coursesPerPageLimit)

  return courses
}
