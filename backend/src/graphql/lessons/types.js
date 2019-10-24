const graphql = require('graphql')
const {
  text,
  audio,
  video,
  pdf,
  quiz
} = require('../../config/constants.js')

/**
 * Every lesson can be one of the following types
 */
const lessontypeType = new graphql.GraphQLEnumType({
  name: 'LessonType',
  values: {
    TEXT: { value: text },
    VIDEO: { value: video },
    AUDIO: { value: audio },
    PDF: { value: pdf },
    QUIZ: { value: quiz }
  }
})

/**
 * A GraphQL type for lessons
 */
const lessonType = new graphql.GraphQLObjectType({
  name: 'Lesson',
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    // slug: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    type: { type: new graphql.GraphQLNonNull(lessontypeType) },
    downloadable: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    creatorId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    // courseId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    content: { type: graphql.GraphQLString },
    contentURL: { type: graphql.GraphQLString }
  }
})

/**
 * A GraphQL type for taking input for creating a lesson
 */
const lessonInputType = new graphql.GraphQLInputObjectType({
  name: 'LessonInput',
  fields: {
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    type: { type: new graphql.GraphQLNonNull(lessontypeType) },
    courseId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    content: { type: graphql.GraphQLString },
    contentURL: { type: graphql.GraphQLString },
    downloadable: { type: graphql.GraphQLBoolean }
  }
})

/**
 * A GraphQL type for taking input for updating a course.
 */
const lessonUpdateType = new graphql.GraphQLInputObjectType({
  name: 'LessonUpdateInput',
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: graphql.GraphQLString },
    type: { type: lessontypeType },
    content: { type: graphql.GraphQLString },
    contentURL: { type: graphql.GraphQLString },
    downloadable: { type: graphql.GraphQLBoolean }
  }
})

module.exports = {
  lessontypeType,
  lessonType,
  lessonInputType,
  lessonUpdateType
}
