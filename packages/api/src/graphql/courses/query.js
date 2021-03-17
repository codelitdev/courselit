const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  getCourse: {
    type: types.courseType,
    args: {
      id: {
        type: graphql.GraphQLString,
      },
      courseId: {
        type: graphql.GraphQLInt,
      },
    },
    resolve: (root, { id, courseId }, context) =>
      logic.getCourse(id, courseId, context),
  },
  getCoursesAsAdmin: {
    type: new graphql.GraphQLList(types.creatorOrAdminCoursesItemType),
    args: {
      offset: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLInt),
      },
    },
    resolve: (root, { offset }, context) =>
      logic.getCoursesAsAdmin(offset, context),
  },
  getPosts: {
    type: new graphql.GraphQLList(types.postType),
    args: {
      offset: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLInt),
      },
    },
    resolve: (root, { offset }, context) => logic.getPosts(offset, context),
  },
  getCourses: {
    type: new graphql.GraphQLList(types.publicCoursesType),
    args: {
      offset: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLInt),
      },
      onlyShowFeatured: {
        type: graphql.GraphQLBoolean,
      },
    },
    resolve: (root, { offset, onlyShowFeatured }, context) =>
      logic.getCourses(offset, onlyShowFeatured, context),
  },
  getEnrolledCourses: {
    type: new graphql.GraphQLList(types.creatorOrAdminCoursesItemType),
    args: {
      userId: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLID),
      },
    },
    resolve: (root, { userId }, context) =>
      logic.getEnrolledCourses(userId, context),
  },
};
