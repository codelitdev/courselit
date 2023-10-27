import { GraphQLList, GraphQLNonNull, GraphQLString } from "graphql";
import types from "./types";
import { updateUser, createSegment, deleteSegment } from "./logic";

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
};

export default mutations;
