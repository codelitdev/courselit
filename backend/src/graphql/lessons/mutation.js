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
  }
}