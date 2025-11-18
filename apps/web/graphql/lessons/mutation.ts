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
    evaluateLesson,
    markLessonCompleted,
    updateLesson,
} from "./logic";
import GQLContext from "../../models/GQLContext";
import { GraphQLJSONObject } from "graphql-type-json";
import type { LessonWithStringContent } from "./logic";

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
            { lessonData }: { lessonData: LessonWithStringContent },
            context: GQLContext,
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
            {
                lessonData,
            }: { lessonData: LessonWithStringContent & { id: string } },
            context: GQLContext,
        ) => updateLesson(lessonData, context),
    },
    markLessonCompleted: {
        type: GraphQLBoolean,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) },
            answers: { type: GraphQLString },
        },
        resolve: async (
            _: any,
            { id, answers }: { id: string; answers: string },
            context: GQLContext,
        ) => markLessonCompleted(id, context),
    },
    evaluateLesson: {
        type: types.evaluationResult,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) },
            answers: { type: new GraphQLNonNull(GraphQLJSONObject) },
        },
        resolve: async (
            _: any,
            { id, answers }: { id: string; answers: { answers: number[][] } },
            context: GQLContext,
        ) => evaluateLesson(id, answers, context),
    },
};
