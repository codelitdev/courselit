import {
    GraphQLEnumType,
    GraphQLString,
    GraphQLID,
    GraphQLInputObjectType,
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLBoolean,
    GraphQLInt,
} from "graphql";
import constants from "../../config/constants";
import mediaTypes from "../media/types";
import { getMedia } from "../media/logic";
import { GraphQLJSONObject } from "graphql-type-json";

const { text, audio, video, pdf, quiz, file, embed } = constants;

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
        FILE: { value: file },
        EMBED: { value: embed },
    },
});

/**
 * A GraphQL type for lessons
 */
const lessonType = new GraphQLObjectType({
    name: "Lesson",
    fields: {
        lessonId: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(lessontypeType) },
        downloadable: { type: new GraphQLNonNull(GraphQLBoolean) },
        creatorId: { type: new GraphQLNonNull(GraphQLID) },
        requiresEnrollment: {
            description: DESCRIPTION_REQUIRES_ENROLLMENT,
            type: new GraphQLNonNull(GraphQLBoolean),
        },
        courseId: { type: new GraphQLNonNull(GraphQLID) },
        content: { type: GraphQLJSONObject },
        media: {
            type: mediaTypes.mediaType,
            resolve: (lesson, _, __, ___) => getMedia(lesson.media),
        },
        prevLesson: { type: GraphQLString },
        nextLesson: { type: GraphQLString },
    },
});

/**
 * A GraphQL type for representing meta infomation regarding a lesson
 */
const lessonMetaType = new GraphQLObjectType({
    name: "LessonMeta",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        lessonId: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(lessontypeType) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        requiresEnrollment: {
            description: DESCRIPTION_REQUIRES_ENROLLMENT,
            type: new GraphQLNonNull(GraphQLBoolean),
        },
        courseId: { type: new GraphQLNonNull(GraphQLID) },
        groupId: { type: new GraphQLNonNull(GraphQLID) },
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
        // media: { type: mediaTypes.mediaInputType },
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
        content: { type: GraphQLString },
        media: { type: mediaTypes.mediaInputType },
        downloadable: { type: GraphQLBoolean },
        requiresEnrollment: {
            description: DESCRIPTION_REQUIRES_ENROLLMENT,
            type: GraphQLBoolean,
        },
    },
});

const evaluationResult = new GraphQLObjectType({
    name: "EvaluationResult",
    fields: {
        pass: { type: new GraphQLNonNull(GraphQLBoolean) },
        score: { type: GraphQLInt },
        requiresPassingGrade: { type: new GraphQLNonNull(GraphQLBoolean) },
        passingGrade: { type: GraphQLInt },
    },
});

export default {
    lessontypeType,
    lessonType,
    lessonInputType,
    lessonUpdateType,
    lessonMetaType,
    evaluationResult,
};
