/**
 * Business logic for managing courses.
 */
const slugify = require("slugify");
const Course = require("../../models/Course.js");
const User = require("../../models/User.js");
const strings = require("../../config/strings.js");
const {
  checkIfAuthenticated,
  validateOffset,
  extractPlainTextFromDraftJS,
  checkPermission,
  checkOwnershipWithoutModel,
} = require("../../lib/graphql.js");
const {
  open,
  itemsPerPage,
  blogPostSnippetLength,
} = require("../../config/constants.js");
const { validateBlogPosts, validateCost } = require("./helpers.js");
const permissions = require("../../config/constants.js").permissions;
const Lesson = require("../../models/Lesson.js");

const getCourseOrThrow = async (id, ctx) => {
  checkIfAuthenticated(ctx);

  const course = await Course.findOne({ _id: id, domain: ctx.subdomain._id });

  if (!course) {
    throw new Error(strings.responses.item_not_found);
  }

  if (!checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])) {
    if (!checkOwnershipWithoutModel(course, ctx)) {
      throw new Error(strings.responses.item_not_found);
    } else {
      if (!checkPermission(ctx.user.permissions, [permissions.manageCourse])) {
        throw new Error(strings.responses.action_not_allowed);
      }
    }
  }

  return course;
};

exports.getCourse = async (id = null, courseId = null, ctx) => {
  if (!id && !courseId) {
    throw new Error(strings.responses.invalid_course_id);
  }

  let course;
  if (id) {
    course = await Course.findOne({ _id: id, domain: ctx.subdomain._id });
  } else {
    course = await Course.findOne({ courseId, domain: ctx.subdomain._id });
  }

  if (!course) {
    throw new Error(strings.responses.item_not_found);
  }

  if (ctx.user) {
    if (
      checkPermission(ctx.user.permissions, [permissions.manageAnyCourse]) ||
      checkOwnershipWithoutModel(course, ctx)
    ) {
      return course;
    }
  }

  if (course.published) {
    return course;
  } else {
    throw new Error(strings.responses.item_not_found);
  }
};

exports.createCourse = async (courseData, ctx) => {
  checkIfAuthenticated(ctx);
  if (!checkPermission(ctx.user.permissions, [permissions.manageCourse])) {
    throw new Error(strings.responses.action_not_allowed);
  }

  courseData = await validateCost(validateBlogPosts(courseData));

  const course = await Course.create({
    domain: ctx.subdomain._id,
    title: courseData.title,
    cost: courseData.cost,
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
  let course = await getCourseOrThrow(courseData.id, ctx);

  for (const key of Object.keys(courseData)) {
    if (
      key === "published" &&
      !checkPermission(ctx.user.permissions, [permissions.publishCourse])
    ) {
      throw new Error(strings.responses.action_not_allowed);
    }

    course[key] = courseData[key];
  }

  course = await validateCost(validateBlogPosts(course));
  course = await course.save();
  return course;
};

exports.deleteCourse = async (id, ctx) => {
  const course = await getCourseOrThrow(id, ctx);

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
  const course = await getCourseOrThrow(courseId, ctx);

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
  const course = await getCourseOrThrow(courseId, ctx);

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

exports.getCoursesAsAdmin = async (offset, ctx) => {
  checkIfAuthenticated(ctx);
  validateOffset(offset);
  const user = ctx.user;

  if (
    !checkPermission(user.permissions, [
      permissions.manageCourse,
      permissions.manageAnyCourse,
    ])
  ) {
    throw new Error(strings.responses.action_not_allowed);
  }

  const query = {
    domain: ctx.subdomain._id,
  };
  if (!checkPermission(user.permissions, [permissions.manageAnyCourse])) {
    query.creatorId = `${user.userId || user.id}`;
  }

  return await Course.find(query)
    .sort({ updated: -1 })
    .skip((offset - 1) * itemsPerPage)
    .limit(itemsPerPage);
};

exports.getPosts = async (offset, ctx) => {
  validateOffset(offset);
  const query = {
    isBlog: true,
    published: true,
    privacy: open.toLowerCase(),
    domain: ctx.subdomain._id,
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

exports.getCourses = async (offset, onlyShowFeatured = false, ctx) => {
  const query = {
    isBlog: false,
    published: true,
    privacy: open.toLowerCase(),
    domain: ctx.subdomain._id,
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

exports.getEnrolledCourses = async (userId, ctx) => {
  checkIfAuthenticated(ctx);

  if (!checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])) {
    throw new Error(strings.responses.action_not_allowed);
  }

  const user = await User.findOne({ _id: userId, domain: ctx.subdomain._id });
  if (!user) {
    throw new Error(strings.responses.user_not_found);
  }

  return Course.find(
    {
      _id: {
        $in: [...user.purchases],
      },
      domain: ctx.subdomain._id,
    },
    "id title"
  );
};

exports.addGroup = async ({ id, name, collapsed, ctx }) => {
  const course = await getCourseOrThrow(id, ctx);
  const existingName = (group) => group.name === name;

  if (course.groups.some(existingName)) {
    throw new Error(strings.responses.existing_group);
  }

  const maximumRank = course.groups.reduce(
    (acc, value) => (value.rank > acc ? value.rank : acc),
    0
  );

  await course.groups.push({
    rank: maximumRank + 1000,
    name,
  });

  await course.save();

  return course;
};

exports.removeGroup = async (id, courseId, ctx) => {
  const course = await getCourseOrThrow(courseId, ctx);
  const group = course.groups.filter((group) => group._id.toString() === id);

  if (!group[0]) {
    return course;
  }

  const countOfAssociatedLessons = await Lesson.countDocuments({
    courseId,
    groupName: group.name,
  });

  if (countOfAssociatedLessons > 0) {
    throw new Error(strings.responses.group_not_empty);
  }

  await course.groups.pull({ _id: id });
  await course.save();

  return course;
};

exports.updateGroup = async ({ id, courseId, name, rank, collapsed, ctx }) => {
  const course = await getCourseOrThrow(courseId, ctx);

  const $set = {};
  if (name) {
    const existingName = (group) =>
      group.name === name && group._id.toString() !== id;

    if (course.groups.some(existingName)) {
      throw new Error(strings.responses.existing_group);
    }

    $set["groups.$.name"] = name;
  }

  if (rank) {
    $set["groups.$.rank"] = rank;
  }

  if (typeof collapsed === "boolean") {
    $set["groups.$.collapsed"] = collapsed;
  }

  return await Course.findOneAndUpdate(
    {
      _id: course._id.toString(),
      "groups._id": id,
    },
    { $set },
    { new: true }
  );
};

// exports.updateGroupName = async (id, courseId, name, ctx) => {
//   const course = await getCourseOrThrow(courseId, ctx);
//   const existingName = (group) => group.name === name;

//   if (course.groups.some(existingName)) {
//     throw new Error(strings.responses.existing_group);
//   }

//   return await Course.findOneAndUpdate(
//     {
//       _id: course._id.toString(),
//       "groups._id": id,
//     },
//     {
//       $set: {
//         "groups.$.name": name,
//       },
//     },
//     {
//       new: true,
//     }
//   );
// };

// exports.updateGroupRank = async (id, courseId, rank, ctx) => {
//   const course = await getCourseOrThrow(courseId, ctx);

//   return await Course.findOneAndUpdate(
//     {
//       _id: course._id.toString(),
//       "groups._id": id,
//     },
//     {
//       $set: {
//         "groups.$.rank": rank,
//       },
//     },
//     {
//       new: true,
//     }
//   );
// };
