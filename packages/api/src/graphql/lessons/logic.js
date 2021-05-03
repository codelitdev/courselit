/**
 * Business logic for managing lessons
 */
// const slugify = require('slugify')
const Lesson = require("../../models/Lesson.js");
const strings = require("../../config/strings.js");
const {
  checkIfAuthenticated,
  checkPermission,
  checkOwnershipWithoutModel,
} = require("../../lib/graphql.js");
const Course = require("../../models/Course.js");
const { lessonValidator } = require("./helpers.js");
const { permissions } = require("../../config/constants.js");
const mongoose = require("mongoose");

const getLessonOrThrow = async (id, ctx) => {
  checkIfAuthenticated(ctx);

  const lesson = await Lesson.findOne({ _id: id, domain: ctx.subdomain._id });

  if (!lesson) {
    throw new Error(strings.responses.item_not_found);
  }

  if (!checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])) {
    if (!checkOwnershipWithoutModel(lesson, ctx)) {
      throw new Error(strings.responses.item_not_found);
    } else {
      if (!checkPermission(ctx.user.permissions, [permissions.manageCourse])) {
        throw new Error(strings.responses.action_not_allowed);
      }
    }
  }

  return lesson;
};

exports.getLesson = async (id, ctx) => {
  return await getLessonOrThrow(id, ctx);
};

exports.getLessonDetails = async (id, ctx) => {
  const lesson = await Lesson.findOne({ _id: id, domain: ctx.subdomain._id });

  if (!lesson) {
    throw new Error(strings.responses.item_not_found);
  }

  if (
    lesson.requiresEnrollment &&
    (!ctx.user || !ctx.user.purchases.includes(lesson.courseId))
  ) {
    throw new Error(strings.responses.not_enrolled);
  }

  return lesson;
};

exports.createLesson = async (lessonData, ctx) => {
  checkIfAuthenticated(ctx);
  if (!checkPermission(ctx.user.permissions, [permissions.manageCourse])) {
    throw new Error(strings.responses.action_not_allowed);
  }

  lessonValidator(lessonData);

  try {
    const course = await Course.findOne({
      _id: lessonData.courseId,
      domain: ctx.subdomain._id,
    });
    if (!course) throw new Error(strings.responses.item_not_found);
    if (course.isBlog) throw new Error(strings.responses.cannot_add_to_blogs);

    const lesson = await Lesson.create({
      domain: ctx.subdomain._id,
      title: lessonData.title,
      type: lessonData.type,
      content: lessonData.content,
      contentURL: lessonData.contentURL,
      downloadable: lessonData.downloadable,
      creatorId: ctx.user._id,
      courseId: course._id,
      groupId: new mongoose.Types.ObjectId(lessonData.groupId),
      groupRank: -1,
    });

    course.lessons.push(lesson.id);
    await course.save();

    return lesson;
  } catch (err) {
    throw new Error(err.message);
  }
};

exports.updateLesson = async (lessonData, ctx) => {
  let lesson = await getLessonOrThrow(lessonData.id, ctx);

  lessonValidator(lessonData);

  for (const key of Object.keys(lessonData)) {
    lesson[key] = lessonData[key];
  }

  lesson = await lesson.save();
  return lesson;
};

exports.deleteLesson = async (id, ctx) => {
  const lesson = await getLessonOrThrow(id, ctx);

  try {
    // remove from the parent Course's lessons array
    let course = await Course.find({
      domain: ctx.subdomain._id,
    }).elemMatch("lessons", { $eq: lesson.id });
    course = course[0];
    if (~course.lessons.indexOf(lesson.id)) {
      course.lessons.splice(course.lessons.indexOf(lesson.id), 1);
    }
    await course.save();

    await lesson.remove();
    return true;
  } catch (err) {
    throw new Error(err.message);
  }
};

// exports.changeTitle = async (id, newTitle, ctx) => {
//   checkIfAuthenticated(ctx);
//   let lesson = await checkLessonOwnership(id, ctx);
//   lesson.title = newTitle;
//   lesson = await lesson.save();
//   return lesson;
// };

// exports.changeContent = async (id, content, ctx) => {
//   checkIfAuthenticated(ctx);
//   let lesson = await checkLessonOwnership(id, ctx);
//   lesson.content = content;
//   lesson = await lesson.save();
//   return lesson;
// };

// exports.changeContentURL = async (id, url, ctx) => {
//   checkIfAuthenticated(ctx);
//   let lesson = await checkLessonOwnership(id, ctx);
//   lesson.contentURL = url;
//   lesson = await lesson.save();
//   return lesson;
// };

// exports.changeDownloadable = async (id, flag, ctx) => {
//   checkIfAuthenticated(ctx);
//   let lesson = await checkLessonOwnership(id, ctx);
//   lesson.downloadable = flag;
//   lesson = await lesson.save();
//   return lesson;
// };

exports.getAllLessons = async (course, ctx) => {
  const lessons = await Lesson.find({
    _id: {
      $in: [...course.lessons],
    },
    domain: ctx.subdomain._id,
  });

  const lessonMetaOnly = (lesson) => ({
    id: lesson.id,
    title: lesson.title,
    requiresEnrollment: lesson.requiresEnrollment,
    courseId: lesson.courseId,
    groupId: lesson.groupId,
    groupRank: lesson.groupRank,
  });

  return lessons.map(lessonMetaOnly);
};
