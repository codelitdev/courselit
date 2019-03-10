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
    slug: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    type: { type: new graphql.GraphQLNonNull(lessontypeType) },
    content: { type: graphql.GraphQLString },
    contentURL: { type: graphql.GraphQLString },
    downloadable: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    courseId: { type: graphql.GraphQLID },
    creatorId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) }
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
    content: { type: graphql.GraphQLString },
    contentURL: { type: graphql.GraphQLString },
    downloadable: { type: graphql.GraphQLBoolean },
    courseId: { type: graphql.GraphQLID }
  }
})

module.exports = {
  lessontypeType,
  lessonType,
  lessonInputType
}
