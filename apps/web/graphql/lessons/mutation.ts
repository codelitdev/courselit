import { GraphQLNonNull, GraphQLBoolean, GraphQLID } from "graphql";
import types from "./types";
import { createLesson, deleteLesson, updateLesson } from "./logic";
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
    // changeTitle: {
    //   type: types.lessonType,
    //   args: {
    //     id: { type: new GraphQLNonNull(GraphQLID) },
    //     newTitle: { type: new GraphQLNonNull(GraphQLString) },
    //   },
    //   resolve: async (root, { id, newTitle }, context) =>
    //     changeTitle(id, newTitle, context),
    // },
    // changeContent: {
    //   type: types.lessonType,
    //   args: {
    //     id: { type: new GraphQLNonNull(GraphQLID) },
    //     content: { type: new GraphQLNonNull(GraphQLString) },
    //   },
    //   resolve: async (root, { id, content }, context) =>
    //     changeContent(id, content, context),
    // },
    // changemedia: {
    //   type: types.lessonType,
    //   args: {
    //     id: { type: new GraphQLNonNull(GraphQLID) },
    //     url: { type: new GraphQLNonNull(GraphQLString) },
    //   },
    //   resolve: async (root, { id, url }, context) =>
    //     changemedia(id, url, context),
    // },
    // changeDownloadable: {
    //   type: types.lessonType,
    //   args: {
    //     id: { type: new GraphQLNonNull(GraphQLID) },
    //     flag: { type: new GraphQLNonNull(GraphQLBoolean) }
    //   },
    //   resolve: async (root, { id, flag }, context) => changeDownloadable(id, flag, context)
    // },
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
};
