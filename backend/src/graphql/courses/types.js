const graphql = require('graphql')
const {
  unlisted,
  open,
  closed
} = require('../../config/constants.js')
// const {
//   lessonType
// } = require('../lessons/types.js')

/**
 * A GraphQL type for course's status
 */
const courseStatusType = new graphql.GraphQLEnumType({
  name: 'CoursePrivacyType',
  values: {
    UNLISTED: { value: unlisted },
    PUBLIC: { value: open },
    PRIVATE: { value: closed }
  }
})

/**
 * A GraphQL type for courses
 */
const courseType = new graphql.GraphQLObjectType({
  name: 'Course',
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    cost: { type: new graphql.GraphQLNonNull(graphql.GraphQLFloat) },
    published: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    privacy: { type: new graphql.GraphQLNonNull(courseStatusType) },
    isBlog: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    isFeatured: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    creatorId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    creatorName: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    lessons: { type: new graphql.GraphQLNonNull(new graphql.GraphQLList(graphql.GraphQLID)) },
    updated: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    slug: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    description: { type: graphql.GraphQLString },
    featuredImage: { type: graphql.GraphQLString }
  }
})

/**
 * A GraphQL type for taking input for creating a course
 */
const courseInputType = new graphql.GraphQLInputObjectType({
  name: 'CourseInput',
  fields: {
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    published: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    privacy: { type: new graphql.GraphQLNonNull(courseStatusType) },
    isBlog: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    isFeatured: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    cost: { type: graphql.GraphQLFloat },
    description: { type: graphql.GraphQLString },
    featuredImage: { type: graphql.GraphQLString }
  }
})

/**
 * A GraphQL type for taking input for updating a course.
 */
const courseUpdateInput = new graphql.GraphQLInputObjectType({
  name: 'CourseUpdateInput',
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: graphql.GraphQLString },
    cost: { type: graphql.GraphQLFloat },
    published: { type: graphql.GraphQLBoolean },
    privacy: { type: courseStatusType },
    isBlog: { type: graphql.GraphQLBoolean },
    isFeatured: { type: graphql.GraphQLBoolean },
    description: { type: graphql.GraphQLString },
    featuredImage: { type: graphql.GraphQLString }
  }
})

/**
 * A GraphQL type for representing a item from my courses list.
 */
const myCoursesItemType = new graphql.GraphQLObjectType({
  name: 'MyCoursesItem',
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) }
  }
})

/**
 * A GraphQL type for blog posts.
 */
const postType = new graphql.GraphQLObjectType({
  name: 'Post',
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    description: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    creatorName: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    updated: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    slug: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    featuredImage: { type: graphql.GraphQLString }
  }
})

/**
 * A GraphQL type for public courses.
 */
const publicCoursesType = new graphql.GraphQLObjectType({
  name: 'PublicCourse',
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    featuredImage: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    cost: { type: new graphql.GraphQLNonNull(graphql.GraphQLFloat) },
    slug: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    updated: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    creatorName: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    description: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    isFeatured: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) }
  }
})

module.exports = {
  courseType,
  courseStatusType,
  courseInputType,
  courseUpdateInput,
  myCoursesItemType,
  postType,
  publicCoursesType
}
