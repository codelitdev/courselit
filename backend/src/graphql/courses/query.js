const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  getCourse: {
    type: types.courseType,
    args: {
      id: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
      }
    },
    resolve: (root, { id }, context) => logic.getCourse(id, context)
  },
  getCreatorCourses: {
    type: new graphql.GraphQLList(types.myCoursesItemType),
    args: {
      id: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLID)
      },
      offset: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLInt)
      }
    },
    resolve: (root, { id, offset }, context) =>
      logic.getCreatorCourses(id, offset, context)
  },
  getPosts: {
    type: new graphql.GraphQLList(types.postType),
    args: {
      offset: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLInt)
      }
    },
    resolve: (root, { offset }, context) => logic.getPosts(offset)
  },
  getPublicCourses: {
    type: new graphql.GraphQLList(types.publicCoursesType),
    args: {
      offset: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLInt)
      },
      onlyShowFeatured: {
        type: graphql.GraphQLBoolean
      }
    },
    resolve: (root, { offset, onlyShowFeatured }, context) =>
      logic.getPublicCourses(offset, onlyShowFeatured)
  }
};
