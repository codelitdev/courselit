const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  createCourse: {
    type: types.courseType,
    args: {
      courseData: {
        type: new graphql.GraphQLNonNull(types.courseInputType),
      },
    },
    resolve: async (root, { courseData }, context) =>
      logic.createCourse(courseData, context),
  },
  updateCourse: {
    type: types.courseType,
    args: {
      courseData: {
        type: new graphql.GraphQLNonNull(types.courseUpdateInput),
      },
    },
    resolve: async (root, { courseData }, context) =>
      logic.updateCourse(courseData, context),
  },
  deleteCourse: {
    type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean),
    args: {
      id: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLID),
      },
    },
    resolve: async (root, { id }, context) => logic.deleteCourse(id, context),
  },
  addLesson: {
    type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean),
    args: {
      courseId: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLID),
      },
      lessonId: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLID),
      },
    },
    resolve: async (root, { courseId, lessonId }, context) =>
      logic.addLesson(courseId, lessonId, context),
  },
  removeLesson: {
    type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean),
    args: {
      courseId: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLID),
      },
      lessonId: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLID),
      },
    },
    resolve: async (root, { courseId, lessonId }, context) =>
      logic.removeLesson(courseId, lessonId, context),
  },
};
