const graphql = require("graphql");
const { text, audio, video, pdf, quiz } = require("../../config/constants");
const { mediaType } = require("../media/types");
const mediaLogic = require("../media/logic");

const DESCRIPTION_REQUIRES_ENROLLMENT =
  "Should the content of this lesson be visible to only enrolled customers.";

/**
 * Every lesson can be one of the following types
 */
const lessontypeType = new graphql.GraphQLEnumType({
  name: "LessonType",
  values: {
    TEXT: { value: text },
    VIDEO: { value: video },
    AUDIO: { value: audio },
    PDF: { value: pdf },
    QUIZ: { value: quiz },
  },
});

/**
 * A GraphQL type for lessons
 */
const lessonType = new graphql.GraphQLObjectType({
  name: "Lesson",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    type: { type: new graphql.GraphQLNonNull(lessontypeType) },
    downloadable: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    creatorId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    requiresEnrollment: {
      description: DESCRIPTION_REQUIRES_ENROLLMENT,
      type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean),
    },
    courseId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    content: { type: graphql.GraphQLString },
    media: {
      type: mediaType,
      resolve: (lesson, args, context, info) =>
        mediaLogic.getMedia(lesson.mediaId, context),
    },
  },
});

/**
 * A GraphQL type for representing meta infomation regarding a lesson
 */
const lessonMetaType = new graphql.GraphQLObjectType({
  name: "LessonMeta",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    requiresEnrollment: {
      description: DESCRIPTION_REQUIRES_ENROLLMENT,
      type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean),
    },
    courseId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    groupId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    groupRank: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
  },
});

/**
 * A GraphQL type for taking input for creating a lesson
 */
const lessonInputType = new graphql.GraphQLInputObjectType({
  name: "LessonInput",
  fields: {
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    type: { type: new graphql.GraphQLNonNull(lessontypeType) },
    courseId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    requiresEnrollment: {
      description: DESCRIPTION_REQUIRES_ENROLLMENT,
      type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean),
    },
    content: { type: graphql.GraphQLString },
    mediaId: { type: graphql.GraphQLID },
    downloadable: { type: graphql.GraphQLBoolean },
    groupId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
  },
});

/**
 * A GraphQL type for taking input for updating a course.
 */
const lessonUpdateType = new graphql.GraphQLInputObjectType({
  name: "LessonUpdateInput",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: graphql.GraphQLString },
    type: { type: lessontypeType },
    content: { type: graphql.GraphQLString },
    mediaId: { type: graphql.GraphQLID },
    downloadable: { type: graphql.GraphQLBoolean },
    requiresEnrollment: {
      description: DESCRIPTION_REQUIRES_ENROLLMENT,
      type: graphql.GraphQLBoolean,
    },
  },
});

module.exports = {
  lessontypeType,
  lessonType,
  lessonInputType,
  lessonUpdateType,
  lessonMetaType,
};
