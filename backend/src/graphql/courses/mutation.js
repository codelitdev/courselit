const graphql = require('graphql')
const types = require('./types.js')
const logic = require('./logic.js')

module.exports = {
  createCourse: {
    type: types.courseType,
    args: {
      courseData: {
        type: new graphql.GraphQLNonNull(types.courseInputType)
      }
    },
    resolve: async (root, { courseData }, context) => logic.createCourse(courseData, context)
  }
}
