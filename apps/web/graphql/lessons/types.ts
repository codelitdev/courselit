import {
    GraphQLEnumType,
    GraphQLString,
    GraphQLID,
    GraphQLInputObjectType,
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLBoolean,
} from "graphql";
import constants from "../../config/constants";
import mediaTypes from "../media/types";
import { getMedia } from "../media/logic";

const { text, audio, video, pdf, quiz } = constants;

const DESCRIPTION_REQUIRES_ENROLLMENT =
    "Should the content of this lesson be visible to only enrolled customers.";

/**
 * Every lesson can be one of the following types
 */
const lessontypeType = new GraphQLEnumType({
    name: "LessonType",
    values: {
        TEXT: { value: text },
        VIDEO: { value: video },
        AUDIO: { value: audio },
        PDF: { value: pdf },
        QUIZ: { value: quiz },
    },
});

/**
 * A GraphQL type for lessons
 */
const lessonType = new GraphQLObjectType({
    name: "Lesson",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(lessontypeType) },
        downloadable: { type: new GraphQLNonNull(GraphQLBoolean) },
        creatorId: { type: new GraphQLNonNull(GraphQLID) },
        requiresEnrollment: {
            description: DESCRIPTION_REQUIRES_ENROLLMENT,
            type: new GraphQLNonNull(GraphQLBoolean),
        },
        courseId: { type: new GraphQLNonNull(GraphQLID) },
        content: { type: GraphQLString },
        media: {
            type: mediaTypes.mediaType,
            resolve: (lesson, args, context, info) => getMedia(lesson.mediaId),
        },
    },
});

/**
 * A GraphQL type for representing meta infomation regarding a lesson
 */
const lessonMetaType = new GraphQLObjectType({
    name: "LessonMeta",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        requiresEnrollment: {
            description: DESCRIPTION_REQUIRES_ENROLLMENT,
            type: new GraphQLNonNull(GraphQLBoolean),
        },
        courseId: { type: new GraphQLNonNull(GraphQLID) },
        groupId: { type: new GraphQLNonNull(GraphQLID) },
        groupRank: { type: new GraphQLNonNull(GraphQLID) },
    },
});

/**
 * A GraphQL type for taking input for creating a lesson
 */
const lessonInputType = new GraphQLInputObjectType({
    name: "LessonInput",
    fields: {
        title: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(lessontypeType) },
        courseId: { type: new GraphQLNonNull(GraphQLID) },
        requiresEnrollment: {
            description: DESCRIPTION_REQUIRES_ENROLLMENT,
            type: new GraphQLNonNull(GraphQLBoolean),
        },
        content: { type: GraphQLString },
        mediaId: { type: GraphQLID },
        downloadable: { type: GraphQLBoolean },
        groupId: { type: new GraphQLNonNull(GraphQLID) },
    },
});

/**
 * A GraphQL type for taking input for updating a course.
 */
const lessonUpdateType = new GraphQLInputObjectType({
    name: "LessonUpdateInput",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: GraphQLString },
        type: { type: lessontypeType },
        content: { type: GraphQLString },
        mediaId: { type: GraphQLID },
        downloadable: { type: GraphQLBoolean },
        requiresEnrollment: {
            description: DESCRIPTION_REQUIRES_ENROLLMENT,
            type: GraphQLBoolean,
        },
    },
});

export default {
    lessontypeType,
    lessonType,
    lessonInputType,
    lessonUpdateType,
    lessonMetaType,
};
