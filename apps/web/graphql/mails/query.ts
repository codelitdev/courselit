import {
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
    GraphQLFloat,
} from "graphql";
import types from "./types";
import {
    getBroadcasts,
    getMailRequestStatus,
    getSequence,
    getSequenceCount,
    getSequences,
    getSequenceOpenRate,
    getSequenceClickThroughRate,
    getEmailSentCount,
    getSubscribers,
    getSubscribersCount,
} from "./logic";
import GQLContext from "../../models/GQLContext";
import { SequenceType } from "@courselit/common-models";
import userTypes from "../users/types";

const queries = {
    getBroadcasts: {
        type: new GraphQLList(types.sequenceList),
        args: {
            offset: { type: GraphQLInt },
            rowsPerPage: { type: GraphQLInt },
        },
        resolve: (
            _: any,
            { offset, rowsPerPage }: { offset?: number; rowsPerPage?: number },
            context: GQLContext,
        ) =>
            getBroadcasts({
                ctx: context,
                offset,
                rowsPerPage,
            }),
    },
    getSequence: {
        type: types.sequence,
        args: {
            sequenceId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (
            _: any,
            { sequenceId }: { sequenceId: string },
            context: GQLContext,
        ) => getSequence(context, sequenceId),
    },
    getSequences: {
        type: new GraphQLList(types.sequence),
        args: {
            type: { type: new GraphQLNonNull(types.sequenceType) },
            offset: { type: GraphQLInt },
            itemsPerPage: { type: GraphQLInt },
        },
        resolve: (
            _: any,
            {
                type,
                offset,
                itemsPerPage,
            }: {
                type: SequenceType;
                offset: number;
                itemsPerPage: number;
            },
            context: GQLContext,
        ) => getSequences({ ctx: context, type, offset, itemsPerPage }),
    },
    getSequenceCount: {
        type: new GraphQLNonNull(GraphQLInt),
        args: {
            type: { type: types.sequenceType },
        },
        resolve: (
            _: any,
            { type }: { type: SequenceType },
            context: GQLContext,
        ) => getSequenceCount({ ctx: context, type }),
    },
    getMailRequest: {
        type: types.mailRequestStatus,
        resolve: (_: any, {}: {}, context: GQLContext) =>
            getMailRequestStatus(context),
    },
    getEmailSentCount: {
        type: new GraphQLNonNull(GraphQLInt),
        args: {
            sequenceId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (
            _: any,
            { sequenceId }: { sequenceId: string },
            context: GQLContext,
        ) => getEmailSentCount({ ctx: context, sequenceId }),
    },
    getSequenceOpenRate: {
        type: new GraphQLNonNull(GraphQLFloat),
        args: {
            sequenceId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (
            _: any,
            { sequenceId }: { sequenceId: string },
            context: GQLContext,
        ) => getSequenceOpenRate({ ctx: context, sequenceId }),
    },
    getSequenceClickThroughRate: {
        type: new GraphQLNonNull(GraphQLFloat),
        args: {
            sequenceId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (
            _: any,
            { sequenceId }: { sequenceId: string },
            context: GQLContext,
        ) => getSequenceClickThroughRate({ ctx: context, sequenceId }),
    },
    getSubscribers: {
        type: new GraphQLList(userTypes.userType),
        args: {
            sequenceId: { type: new GraphQLNonNull(GraphQLString) },
            page: { type: GraphQLInt },
            limit: { type: GraphQLInt },
        },
        resolve: (
            _: any,
            {
                sequenceId,
                page,
                limit,
            }: { sequenceId: string; page?: number; limit?: number },
            context: GQLContext,
        ) => getSubscribers({ ctx: context, sequenceId, page, limit }),
    },
    getSubscribersCount: {
        type: new GraphQLNonNull(GraphQLInt),
        args: {
            sequenceId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (
            _: any,
            { sequenceId }: { sequenceId: string },
            context: GQLContext,
        ) => getSubscribersCount({ ctx: context, sequenceId }),
    },
};

export default queries;
