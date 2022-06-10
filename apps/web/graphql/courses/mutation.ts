import {
    GraphQLNonNull,
    GraphQLBoolean,
    GraphQLID,
    GraphQLString,
    GraphQLInt,
} from "graphql";
import types from "./types";
import {
    createCourse,
    updateCourse,
    deleteCourse,
    removeGroup,
    addLesson,
    removeLesson,
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
            context: GQLContext
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
    addLesson: {
        type: new GraphQLNonNull(GraphQLBoolean),
        args: {
            courseId: {
                type: new GraphQLNonNull(GraphQLID),
            },
            lessonId: {
                type: new GraphQLNonNull(GraphQLID),
            },
        },
        resolve: async (_: unknown, { courseId, lessonId }, context) =>
            addLesson(courseId, lessonId, context),
    },
    removeLesson: {
        type: new GraphQLNonNull(GraphQLBoolean),
        args: {
            courseId: {
                type: new GraphQLNonNull(GraphQLID),
            },
            lessonId: {
                type: new GraphQLNonNull(GraphQLID),
            },
        },
        resolve: async (_: unknown, { courseId, lessonId }, context) =>
            removeLesson(courseId, lessonId, context),
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
                type: new GraphQLNonNull(GraphQLID),
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
        },
        resolve: async (
            _: unknown,
            { id, courseId, name, rank, collapsed },
            context
        ) =>
            updateGroup({
                id,
                courseId,
                name,
                rank,
                collapsed,
                ctx: context,
            }),
    },
};
