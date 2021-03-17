const graphql = require("graphql");
const { unlisted, open, closed } = require("../../config/constants.js");
const { lessonMetaType } = require("../lessons/types.js");
const lessonLogic = require("../lessons/logic.js");

const courseStatusType = new graphql.GraphQLEnumType({
  name: "CoursePrivacyType",
  values: {
    UNLISTED: { value: unlisted },
    PUBLIC: { value: open },
    PRIVATE: { value: closed },
  },
});

const courseType = new graphql.GraphQLObjectType({
  name: "Course",
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
    lessons: {
      type: new graphql.GraphQLList(lessonMetaType),
      resolve: (course, args, context, info) =>
        lessonLogic.getAllLessons(course, context),
    },
    updated: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    slug: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    courseId: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) },
    description: { type: graphql.GraphQLString },
    featuredImage: { type: graphql.GraphQLString },
  },
});

const courseInputType = new graphql.GraphQLInputObjectType({
  name: "CourseInput",
  fields: {
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    published: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    privacy: { type: new graphql.GraphQLNonNull(courseStatusType) },
    isBlog: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    isFeatured: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    cost: { type: graphql.GraphQLFloat },
    description: { type: graphql.GraphQLString },
    featuredImage: { type: graphql.GraphQLString },
  },
});

const courseUpdateInput = new graphql.GraphQLInputObjectType({
  name: "CourseUpdateInput",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: graphql.GraphQLString },
    cost: { type: graphql.GraphQLFloat },
    published: { type: graphql.GraphQLBoolean },
    privacy: { type: courseStatusType },
    isBlog: { type: graphql.GraphQLBoolean },
    isFeatured: { type: graphql.GraphQLBoolean },
    description: { type: graphql.GraphQLString },
    featuredImage: { type: graphql.GraphQLString },
  },
});

const creatorOrAdminCoursesItemType = new graphql.GraphQLObjectType({
  name: "CreatorOrAdminCoursesItem",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
  },
});

const postType = new graphql.GraphQLObjectType({
  name: "Post",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    description: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    creatorName: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    updated: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    slug: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    courseId: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) },
    featuredImage: { type: graphql.GraphQLString },
  },
});

const publicCoursesType = new graphql.GraphQLObjectType({
  name: "PublicCourse",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    featuredImage: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    cost: { type: new graphql.GraphQLNonNull(graphql.GraphQLFloat) },
    slug: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    updated: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    creatorName: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    description: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    isFeatured: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    courseId: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) },
  },
});

module.exports = {
  courseType,
  courseStatusType,
  courseInputType,
  courseUpdateInput,
  creatorOrAdminCoursesItemType,
  postType,
  publicCoursesType,
};
