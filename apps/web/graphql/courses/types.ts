import {
    GraphQLNonNull,
    GraphQLString,
    GraphQLInt,
    GraphQLID,
    GraphQLObjectType,
    GraphQLBoolean,
    GraphQLEnumType,
    GraphQLFloat,
    GraphQLList,
    GraphQLInputObjectType,
} from "graphql";
import constants from "../../config/constants";
import lessonTypes from "../lessons/types";
import { getAllLessons } from "../lessons/logic";
import { getMedia } from "../media/logic";
import mediaTypes from "../media/types";

const { lessonMetaType } = lessonTypes;
const { unlisted, open } = constants;

const courseStatusType = new GraphQLEnumType({
    name: "CoursePrivacyType",
    values: {
        UNLISTED: { value: unlisted },
        PUBLIC: { value: open },
    },
});

const courseGroupType = new GraphQLObjectType({
    name: "GroupType",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        rank: { type: new GraphQLNonNull(GraphQLInt) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        collapsed: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
});

const courseType = new GraphQLObjectType({
    name: "Course",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        cost: { type: new GraphQLNonNull(GraphQLFloat) },
        published: { type: new GraphQLNonNull(GraphQLBoolean) },
        privacy: { type: new GraphQLNonNull(courseStatusType) },
        isBlog: { type: new GraphQLNonNull(GraphQLBoolean) },
        isFeatured: { type: new GraphQLNonNull(GraphQLBoolean) },
        tags: { type: new GraphQLList(GraphQLString) },
        creatorId: { type: new GraphQLNonNull(GraphQLID) },
        creatorName: { type: GraphQLString },
        lessons: {
            type: new GraphQLList(lessonMetaType),
            resolve: (course, args, context, info) =>
                getAllLessons(course, context),
        },
        updatedAt: { type: new GraphQLNonNull(GraphQLString) },
        slug: { type: new GraphQLNonNull(GraphQLString) },
        courseId: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        featuredImage: {
            type: mediaTypes.mediaType,
            resolve: (course, _, context, __) => getMedia(course.featuredImage),
        },
        groups: { type: new GraphQLList(courseGroupType) },
    },
});

const courseInputType = new GraphQLInputObjectType({
    name: "CourseInput",
    fields: {
        title: { type: new GraphQLNonNull(GraphQLString) },
        privacy: { type: new GraphQLNonNull(courseStatusType) },
        isBlog: { type: new GraphQLNonNull(GraphQLBoolean) },
        isFeatured: { type: new GraphQLNonNull(GraphQLBoolean) },
        tags: { type: new GraphQLList(GraphQLString) },
        cost: { type: GraphQLFloat },
        description: { type: GraphQLString },
        featuredImage: { type: GraphQLString },
    },
});

const courseUpdateInput = new GraphQLInputObjectType({
    name: "CourseUpdateInput",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: GraphQLString },
        cost: { type: GraphQLFloat },
        published: { type: GraphQLBoolean },
        privacy: { type: courseStatusType },
        isBlog: { type: GraphQLBoolean },
        isFeatured: { type: GraphQLBoolean },
        tags: { type: new GraphQLList(GraphQLString) },
        description: { type: GraphQLString },
        featuredImage: { type: GraphQLString },
    },
});

const creatorOrAdminCoursesItemType = new GraphQLObjectType({
    name: "CreatorOrAdminCoursesItem",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        featuredImage: {
            type: mediaTypes.mediaType,
            resolve: (course, args, context, info) =>
                getMedia(course.featuredImage),
        },
        isBlog: { type: new GraphQLNonNull(GraphQLBoolean) },
        courseId: { type: new GraphQLNonNull(GraphQLString) },
    },
});

const postType = new GraphQLObjectType({
    name: "Post",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: new GraphQLNonNull(GraphQLString) },
        creatorName: { type: GraphQLString },
        updatedAt: { type: new GraphQLNonNull(GraphQLString) },
        slug: { type: new GraphQLNonNull(GraphQLString) },
        courseId: { type: new GraphQLNonNull(GraphQLString) },
        featuredImage: {
            type: mediaTypes.mediaType,
            resolve: (course, args, context, info) =>
                getMedia(course.featuredImage),
        },
        tags: { type: new GraphQLList(GraphQLString) },
    },
});

const publicCoursesType = new GraphQLObjectType({
    name: "PublicCourse",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        cost: { type: new GraphQLNonNull(GraphQLFloat) },
        isBlog: { type: new GraphQLNonNull(GraphQLBoolean) },
        description: { type: new GraphQLNonNull(GraphQLString) },
        creatorName: { type: GraphQLString },
        updatedAt: { type: new GraphQLNonNull(GraphQLString) },
        slug: { type: new GraphQLNonNull(GraphQLString) },
        featuredImage: {
            type: mediaTypes.mediaType,
            resolve: (course, args, context, info) =>
                getMedia(course.featuredImage),
        },
        courseId: { type: new GraphQLNonNull(GraphQLString) },
        isFeatured: { type: new GraphQLNonNull(GraphQLBoolean) },
        tags: { type: new GraphQLList(GraphQLString) },
        groups: { type: new GraphQLList(courseGroupType) },
    },
});

export default {
    courseType,
    courseStatusType,
    courseInputType,
    courseUpdateInput,
    creatorOrAdminCoursesItemType,
    postType,
    publicCoursesType,
};
