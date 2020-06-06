const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  createLesson: {
    type: types.lessonType,
    args: {
      lessonData: {
        type: new graphql.GraphQLNonNull(types.lessonInputType),
      },
    },
    resolve: async (root, { lessonData }, context) =>
      logic.createLesson(lessonData, context),
  },
  deleteLesson: {
    type: graphql.GraphQLBoolean,
    args: {
      id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    },
    resolve: async (root, { id }, context) => logic.deleteLesson(id, context),
  },
  changeTitle: {
    type: types.lessonType,
    args: {
      id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
      newTitle: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    },
    resolve: async (root, { id, newTitle }, context) =>
      logic.changeTitle(id, newTitle, context),
  },
  changeContent: {
    type: types.lessonType,
    args: {
      id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
      content: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    },
    resolve: async (root, { id, content }, context) =>
      logic.changeContent(id, content, context),
  },
  changeContentURL: {
    type: types.lessonType,
    args: {
      id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
      url: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    },
    resolve: async (root, { id, url }, context) =>
      logic.changeContentURL(id, url, context),
  },
  // changeDownloadable: {
  //   type: types.lessonType,
  //   args: {
  //     id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
  //     flag: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) }
  //   },
  //   resolve: async (root, { id, flag }, context) => logic.changeDownloadable(id, flag, context)
  // },
  updateLesson: {
    type: types.lessonType,
    args: {
      lessonData: {
        type: new graphql.GraphQLNonNull(types.lessonUpdateType),
      },
    },
    resolve: async (root, { lessonData }, context) =>
      logic.updateLesson(lessonData, context),
  },
};
