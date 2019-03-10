const graphql = require('graphql')
const types = require('./types.js')
const logic = require('./logic.js')

module.exports = {
  createLesson: {
    type: types.lessonType,
    args: {
      lessonData: {
        type: new graphql.GraphQLNonNull(types.lessonInputType)
      }
    },
    resolve: async (root, { lessonData }, context) => logic.createLesson(lessonData, context)
  },
  deleteLesson: {
    type: graphql.GraphQLBoolean,
    args: {
      id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) }
    },
    resolve: async (root, { id }, context) => logic.deleteLesson(id, context)
  },
  changeTitle: {
    type: types.lessonType,
    args: {
      id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
      newTitle: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) }
    },
    resolve: async (root, { id, newTitle }, context) => logic.changeTitle(id, newTitle, context)
  }
}
