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
import constants from "../../../config/constants";
import lessonTypes from "../../lessons/types";
import { getAllLessons } from "../../lessons/logic";
import { getMedia } from "../../media/logic";
import mediaTypes from "../../media/types";
import { reports } from "./reports";
import { Constants } from "@courselit/common-models";

const { lessonMetaType } = lessonTypes;
const {
    unlisted,
    open,
    course,
    download,
    blog,
    costPaid,
    costEmail,
    costFree,
} = constants;

const courseStatusType = new GraphQLEnumType({
    name: "CoursePrivacyType",
    values: {
        UNLISTED: { value: unlisted },
        PUBLIC: { value: open },
    },
});

const courseCostType = new GraphQLEnumType({
    name: "CostType",
    values: {
        PAID: { value: costPaid },
        FREE: { value: costFree },
        EMAIL: { value: costEmail },
    },
});

const courseTypeFilters = new GraphQLEnumType({
    name: "CourseType",
    values: {
        COURSE: { value: course },
        BLOG: { value: blog },
        DOWNLOAD: { value: download },
    },
});

const dripTypeType = new GraphQLEnumType({
    name: "DripTypeType",
    values: {
        [Constants.dripType[0].toUpperCase().split("-")[0]]: {
            value: Constants.dripType[0],
        },
        [Constants.dripType[1].toUpperCase().split("-")[0]]: {
            value: Constants.dripType[1],
        },
    },
});

const dripEmailInput = new GraphQLInputObjectType({
    name: "DripEmailInput",
    fields: {
        content: { type: new GraphQLNonNull(GraphQLString) },
        subject: { type: new GraphQLNonNull(GraphQLString) },
    },
});

const dripEmail = new GraphQLObjectType({
    name: "DripEmail",
    fields: {
        content: { type: new GraphQLNonNull(GraphQLString) },
        subject: { type: new GraphQLNonNull(GraphQLString) },
    },
});

const dripInputType = new GraphQLInputObjectType({
    name: "DripInput",
    fields: {
        type: { type: dripTypeType },
        status: { type: GraphQLBoolean },
        delayInMillis: { type: GraphQLFloat },
        dateInUTC: { type: GraphQLFloat },
        email: { type: dripEmailInput },
    },
});

const dripType = new GraphQLObjectType({
    name: "Drip",
    fields: {
        type: { type: new GraphQLNonNull(dripTypeType) },
        status: { type: new GraphQLNonNull(GraphQLBoolean) },
        delayInMillis: { type: GraphQLFloat },
        dateInUTC: { type: GraphQLFloat },
        email: { type: dripEmail },
    },
});

const courseGroupType = new GraphQLObjectType({
    name: "GroupType",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        rank: { type: new GraphQLNonNull(GraphQLInt) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        collapsed: { type: new GraphQLNonNull(GraphQLBoolean) },
        lessonsOrder: { type: new GraphQLList(GraphQLString) },
        drip: { type: dripType },
    },
});

const courseType = new GraphQLObjectType({
    name: "Course",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        cost: { type: new GraphQLNonNull(GraphQLFloat) },
        costType: { type: courseCostType },
        published: { type: new GraphQLNonNull(GraphQLBoolean) },
        privacy: { type: new GraphQLNonNull(courseStatusType) },
        isBlog: { type: new GraphQLNonNull(GraphQLBoolean) },
        isFeatured: { type: new GraphQLNonNull(GraphQLBoolean) },
        type: { type: new GraphQLNonNull(courseTypeFilters) },
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
        pageId: { type: new GraphQLNonNull(GraphQLString) },
        firstLesson: { type: GraphQLString },
    },
});

const courseInputType = new GraphQLInputObjectType({
    name: "CourseInput",
    fields: {
        title: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(courseTypeFilters) },
    },
});

const courseUpdateInput = new GraphQLInputObjectType({
    name: "CourseUpdateInput",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: GraphQLString },
        costType: { type: courseCostType },
        cost: { type: GraphQLFloat },
        published: { type: GraphQLBoolean },
        privacy: { type: courseStatusType },
        tags: { type: new GraphQLList(GraphQLString) },
        description: { type: GraphQLString },
        featuredImage: { type: mediaTypes.mediaInputType },
    },
});

const adminCourseItemType = new GraphQLObjectType({
    name: "adminCourseItem",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        featuredImage: {
            type: mediaTypes.mediaType,
            resolve: (course, args, context, info) =>
                getMedia(course.featuredImage),
        },
        courseId: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(courseTypeFilters) },
        published: { type: new GraphQLNonNull(GraphQLBoolean) },
        sales: { type: new GraphQLNonNull(GraphQLInt) },
        customers: { type: new GraphQLNonNull(GraphQLInt) },
        pageId: { type: GraphQLString },
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
        costType: { type: courseCostType },
        cost: { type: new GraphQLNonNull(GraphQLFloat) },
        description: { type: GraphQLString },
        type: { type: new GraphQLNonNull(courseTypeFilters) },
        creatorName: { type: GraphQLString },
        updatedAt: { type: new GraphQLNonNull(GraphQLString) },
        slug: { type: new GraphQLNonNull(GraphQLString) },
        featuredImage: {
            type: mediaTypes.mediaType,
            resolve: (course, args, context, info) =>
                getMedia(course.featuredImage),
        },
        courseId: { type: new GraphQLNonNull(GraphQLString) },
        tags: { type: new GraphQLList(GraphQLString) },
        groups: { type: new GraphQLList(courseGroupType) },
        pageId: { type: GraphQLString },
    },
});

const enrolledCourses = new GraphQLObjectType({
    name: "EnrolledCourses",
    fields: {
        courseId: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(courseTypeFilters) },
        progress: { type: new GraphQLNonNull(GraphQLFloat) },
        slug: { type: new GraphQLNonNull(GraphQLString) },
    },
});

export default {
    courseType,
    courseStatusType,
    courseInputType,
    courseUpdateInput,
    adminCourseItemType,
    postType,
    publicCoursesType,
    enrolledCourses,
    reports,
    dripType,
    dripInputType,
};
