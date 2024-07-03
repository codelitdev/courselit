import {
    GraphQLNonNull,
    GraphQLBoolean,
    GraphQLID,
    GraphQLString,
    GraphQLInt,
    GraphQLList,
} from "graphql";
import types from "./types";
import {
    createCourse,
    updateCourse,
    deleteCourse,
    removeGroup,
    addGroup,
    updateGroup,
} from "./logic";
import GQLContext from "../../models/GQLContext";

export default {
    createCourse: {
        type: types.courseType,
        args: {
            courseData: {
                type: new GraphQLNonNull(types.courseInputType),
            },
        },
        resolve: async (
            _: any,
            { courseData }: { courseData: Record<string, unknown> },
            context: GQLContext,
        ) => createCourse(courseData, context),
    },
    updateCourse: {
        type: types.courseType,
        args: {
            courseData: {
                type: new GraphQLNonNull(types.courseUpdateInput),
            },
        },
        resolve: async (_: unknown, { courseData }, context) =>
            updateCourse(courseData, context),
    },
    deleteCourse: {
        type: new GraphQLNonNull(GraphQLBoolean),
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLID),
            },
        },
        resolve: async (_: unknown, { id }, context) =>
            deleteCourse(id, context),
    },
    addGroup: {
        type: types.courseType,
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLID),
            },
            name: {
                type: new GraphQLNonNull(GraphQLString),
            },
            collapsed: {
                type: GraphQLBoolean,
            },
        },
        resolve: async (_: unknown, { id, name, collapsed }, context) =>
            addGroup({ id, name, collapsed, ctx: context }),
    },
    removeGroup: {
        type: types.courseType,
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLID),
            },
            courseId: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: async (_: unknown, { id, courseId }, context) =>
            removeGroup(id, courseId, context),
    },
    updateGroup: {
        type: types.courseType,
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLID),
            },
            courseId: {
                type: new GraphQLNonNull(GraphQLID),
            },
            name: {
                type: GraphQLString,
            },
            rank: {
                type: GraphQLInt,
            },
            collapsed: {
                type: GraphQLBoolean,
            },
            lessonsOrder: {
                type: new GraphQLList(GraphQLString),
            },
            drip: {
                type: types.dripInputType,
            },
        },
        resolve: async (
            _: unknown,
            { id, courseId, name, rank, collapsed, lessonsOrder, drip },
            context,
        ) =>
            updateGroup({
                id,
                courseId,
                name,
                rank,
                collapsed,
                lessonsOrder,
                drip,
                ctx: context,
            }),
    },
};
