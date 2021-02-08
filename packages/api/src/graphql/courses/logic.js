/**
 * Business logic for managing courses.
 */
const slugify = require("slugify");
const Course = require("../../models/Course.js");
const User = require("../../models/User.js");
const strings = require("../../config/strings.js");
const {
  checkIfAuthenticated,
  checkOwnership,
  validateOffset,
  extractPlainTextFromDraftJS,
} = require("../../lib/graphql.js");
const {
  closed,
  open,
  itemsPerPage,
  blogPostSnippetLength,
} = require("../../config/constants.js");
const ObjectId = require("mongoose").Types.ObjectId;

const checkCourseOwnership = checkOwnership(Course);

const validateBlogPosts = (courseData) => {
  if (courseData.isBlog) {
    if (!courseData.description) {
      throw new Error(strings.responses.blog_description_empty);
    }
    courseData.cost = 0;
  } else {
    if (courseData.cost < 0) throw new Error(strings.responses.invalid_cost);
  }

  return courseData;
};

exports.getCourse = async (id = null, courseId = null, ctx) => {
  if (!id && !courseId) {
    throw new Error(strings.responses.invalid_course_id);
  }

  let course;
  if (id) {
    course = await Course.findById(id);
  } else {
    course = await Course.findOne({ courseId });
  }

  if (!course) {
    throw new Error(strings.responses.item_not_found);
  }

  const notTheOwner =
    !ctx.user ||
    (ObjectId.isValid(course.creatorId)
      ? course.creatorId.toString() !== ctx.user._id.toString()
      : course.creatorId.toString() !== ctx.user.userId.toString());
  if (notTheOwner) {
    if (!course.published || course.privacy === closed) {
      throw new Error(strings.responses.item_not_found);
    }
  }

  return course;
};

exports.createCourse = async (courseData, ctx) => {
  checkIfAuthenticated(ctx);

  if (ctx.user.isCreator === undefined || !ctx.user.isCreator) {
    throw new Error(strings.responses.not_a_creator);
  }

  courseData = validateBlogPosts(courseData);

  const course = await Course.create({
    title: courseData.title,
    cost: courseData.cost,
    published: courseData.published,
    privacy: courseData.privacy,
    isBlog: courseData.isBlog,
    isFeatured: courseData.isFeatured,
    description: courseData.description,
    featuredImage: courseData.featuredImage,
    creatorId: ctx.user.userId || ctx.user._id,
    creatorName: ctx.user.name,
    slug: slugify(courseData.title.toLowerCase()),
  });

  return course;
};

exports.updateCourse = async (courseData, ctx) => {
  checkIfAuthenticated(ctx);
  let course = await checkCourseOwnership(courseData.id, ctx);

  for (const key of Object.keys(courseData)) {
    course[key] = courseData[key];
  }

  course = validateBlogPosts(course);
  course = await course.save();
  return course;
};

exports.deleteCourse = async (id, ctx) => {
  checkIfAuthenticated(ctx);
  const course = await checkCourseOwnership(id, ctx);

  if (course.lessons.length > 0) {
    throw new Error(strings.responses.course_not_empty);
  }

  try {
    await course.remove();
    return true;
  } catch (err) {
    throw new Error(err.message);
  }
};

exports.addLesson = async (courseId, lessonId, ctx) => {
  checkIfAuthenticated(ctx);
  const course = await checkCourseOwnership(courseId, ctx);
  if (course.lessons.indexOf(lessonId) === -1) {
    course.lessons.push(lessonId);
  }

  try {
    await course.save();
  } catch (err) {
    return false;
  }

  return true;
};

exports.removeLesson = async (courseId, lessonId, ctx) => {
  checkIfAuthenticated(ctx);
  const course = await checkCourseOwnership(courseId, ctx);
  if (~course.lessons.indexOf(lessonId)) {
    course.lessons.splice(course.lessons.indexOf(lessonId), 1);
  }

  try {
    await course.save();
  } catch (err) {
    return false;
  }

  return true;
};

exports.getCreatorCourses = async (id, offset, ctx) => {
  checkIfAuthenticated(ctx);
  validateOffset(offset);

  const user = await User.findById(id);
  if (!user) {
    throw new Error(strings.responses.user_not_found);
  }

  const courses = await Course.find({ creatorId: `${user.userId || user.id}` })
    .sort({ updated: -1 })
    .skip((offset - 1) * itemsPerPage)
    .limit(itemsPerPage);

  return courses;
};

exports.getPosts = async (offset) => {
  validateOffset(offset);
  const query = {
    isBlog: true,
    published: true,
    privacy: open.toLowerCase(),
  };
  const posts = await Course.find(
    query,
    "id title description creatorName updated slug featuredImage courseId"
  )
    .sort({ updated: -1 })
    .skip((offset - 1) * itemsPerPage)
    .limit(itemsPerPage);

  return posts.map((x) => ({
    id: x.id,
    title: x.title,
    description: extractPlainTextFromDraftJS(
      x.description,
      blogPostSnippetLength
    ),
    creatorName: x.creatorName,
    updated: x.updated,
    slug: x.slug,
    featuredImage: x.featuredImage,
    courseId: x.courseId,
  }));
};

exports.getCourses = async (offset, onlyShowFeatured = false) => {
  const query = {
    isBlog: false,
    published: true,
    privacy: open.toLowerCase(),
  };
  if (onlyShowFeatured) {
    query.isFeatured = true;
  }

  let dbQuery = Course.find(
    query,
    "id title featuredImage cost creatorName slug description updated isFeatured courseId"
  ).sort({ updated: -1 });
  dbQuery = dbQuery.skip((offset - 1) * itemsPerPage).limit(itemsPerPage);

  return dbQuery;
};

// TODO: write tests
exports.getEnrolledCourses = async (userId, ctx) => {
  checkIfAuthenticated(ctx);
  const notAdminOrSelf =
    !(ctx.user.isCreator || ctx.user.isAdmin) && userId !== ctx.user.id;

  if (notAdminOrSelf) {
    throw new Error(strings.responses.item_not_found);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error(strings.responses.user_not_found);
  }

  return Course.find(
    {
      _id: {
        $in: [...user.purchases],
      },
    },
    "id title"
  );
};
