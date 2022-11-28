import {
    GraphQLNonNull,
    GraphQLBoolean,
    GraphQLID,
    GraphQLString,
} from "graphql";
import types from "./types";
import {
    createLesson,
    deleteLesson,
    markLessonCompleted,
    updateLesson,
} from "./logic";
import { Lesson } from "../../models/Lesson";
import GQLContext from "../../models/GQLContext";

export default {
    createLesson: {
        type: types.lessonType,
        args: {
            lessonData: {
                type: new GraphQLNonNull(types.lessonInputType),
            },
        },
        resolve: async (
            _: any,
            { lessonData }: { lessonData: Lesson },
            context: GQLContext
        ) => createLesson(lessonData, context),
    },
    deleteLesson: {
        type: GraphQLBoolean,
        args: {
            id: { type: new GraphQLNonNull(GraphQLID) },
        },
        resolve: async (_: any, { id }: { id: string }, context: GQLContext) =>
            deleteLesson(id, context),
    },
    updateLesson: {
        type: types.lessonType,
        args: {
            lessonData: {
                type: new GraphQLNonNull(types.lessonUpdateType),
            },
        },
        resolve: async (
            _: any,
            { lessonData }: { lessonData: Lesson },
            context: GQLContext
        ) => updateLesson(lessonData, context),
    },
    markLessonCompleted: {
        type: GraphQLBoolean,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (_: any, { id }: { id: string }, context: GQLContext) =>
            markLessonCompleted(id, context),
    },
};
