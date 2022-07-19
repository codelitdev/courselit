import { GraphQLNonNull, GraphQLID, GraphQLString } from "graphql";
import types from "./types";
import { getLesson, getLessonDetails } from "./logic";
import GQLContext from "../../models/GQLContext";

export default {
    getLesson: {
        type: types.lessonType,
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLID),
            },
        },
        resolve: (_: any, { id }: { id: string }, context: GQLContext) =>
            getLesson(id, context),
    },
    getLessonDetails: {
        type: types.lessonType,
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: (_: any, { id }: { id: string }, context: GQLContext) =>
            getLessonDetails(id, context),
    },
};
