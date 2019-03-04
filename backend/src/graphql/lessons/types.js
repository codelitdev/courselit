const graphql = require('graphql')

/**
 * Every lesson can be one of the following types
 */
const lessontypeType = new graphql.GraphQLEnumType({
  name: 'LessonType',
  values: {
    TEXT: { value: 0 },
    VIDEO: { value: 1 },
    AUDIO: { value: 2 },
    PDF: { value: 3 },
    QUIZ: { value: 4 }
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
