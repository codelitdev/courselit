import { GraphQLList, GraphQLNonNull, GraphQLString } from "graphql";
import types from "./types";
import {
    updateUser,
    createSegment,
    deleteSegment,
    addTags,
    deleteTag,
    untagUsers,
} from "./logic";

const mutations = {
    updateUser: {
        type: types.userType,
        args: {
            userData: {
                type: new GraphQLNonNull(types.userUpdateInput),
            },
        },
        resolve: async (_: any, { userData }: any, context: any) =>
            updateUser(userData, context),
    },
    createSegment: {
        type: new GraphQLList(types.userSegment),
        args: {
            segmentData: {
                type: new GraphQLNonNull(types.createSegmentInput),
            },
        },
        resolve: async (
            _: any,
            { segmentData }: { segmentData: { name: string; filter: string } },
            context: any,
        ) => createSegment(segmentData, context),
    },
    deleteSegment: {
        type: new GraphQLList(types.userSegment),
        args: {
            segmentId: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: async (
            _: any,
            { segmentId }: { segmentId: string },
            context: any,
        ) => deleteSegment(segmentId, context),
    },
    addTags: {
        type: new GraphQLList(GraphQLString),
        args: {
            tags: {
                type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
            },
        },
        resolve: async (_: any, { tags }: { tags: string[] }, context: any) =>
            addTags(tags, context),
    },
    deleteTag: {
        type: new GraphQLList(types.tagWithDetails),
        args: {
            name: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: async (_: any, { name }: { name: string }, context: any) =>
            deleteTag(name, context),
    },
    untagUsers: {
        type: new GraphQLList(types.tagWithDetails),
        args: {
            name: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: async (_: any, { name }: { name: string }, context: any) =>
            untagUsers(name, context),
    },
};

export default mutations;
