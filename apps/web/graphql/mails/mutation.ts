import {
    GraphQLBoolean,
    GraphQLFloat,
    GraphQLNonNull,
    GraphQLString,
} from "graphql";
import GQLContext from "../../models/GQLContext";
import {
    createSubscription,
    // createMail,
    updateMail,
    // sendMail,
    sendCourseOverMail,
    createSequence,
    // createBroadcast,
    // updateBroadcast,
    toggleEmailPublishStatus,
    updateSequence,
    startSequence,
} from "./logic";
import types from "./types";
import { Constants } from "@courselit/common-models";

const mutations = {
    createSubscription: {
        type: GraphQLBoolean,
        args: {
            email: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            { email }: { email: string },
            context: GQLContext,
        ) => createSubscription(email, context),
    },
    // createMail: {
    //     type: types.mail,
    //     args: {
    //         searchData: { type: userTypes.userSearchInput },
    //     },
    //     resolve: async (
    //         _: any,
    //         { searchData }: { searchData: any },
    //         context: GQLContext,
    //     ) => createMail(searchData, context),
    // },
    createSequence: {
        type: types.sequence,
        args: {
            type: { type: new GraphQLNonNull(types.sequenceType) },
        },
        resolve: async (
            _: any,
            { type }: { type: (typeof Constants.mailTypes)[number] },
            context: GQLContext,
        ) => createSequence(context, type),
    },
    // createBroadcast: {
    //     type: types.sequence,
    //     args: {},
    //     resolve: async (_: any, {}: {}, context: GQLContext) =>
    //         createBroadcast(context),
    // },
    updateEmail: {
        type: types.sequence,
        args: {
            sequenceId: { type: new GraphQLNonNull(GraphQLString) },
            title: { type: GraphQLString },
            filter: { type: GraphQLString },
            templateId: { type: GraphQLString },
            content: { type: GraphQLString },
            delayInMillis: { type: GraphQLFloat },
        },
        resolve: async (
            _: any,
            {
                sequenceId,
                filter,
                title,
                templateId,
                content,
                delayInMillis,
            }: {
                sequenceId: string;
                filter?: string;
                title?: string;
                templateId?: string;
                content?: string;
                delayInMillis?: number;
            },
            context: GQLContext,
        ) =>
            updateMail({
                ctx: context,
                sequenceId,
                filter,
                title,
                templateId,
                content,
                delayInMillis,
            }),
    },
    updateSequence: {
        type: types.sequence,
        args: {
            sequenceId: { type: new GraphQLNonNull(GraphQLString) },
            title: { type: GraphQLString },
            fromName: { type: GraphQLString },
            fromEmail: { type: GraphQLString },
            trigger: { type: types.sequenceTrigger },
            filter: { type: GraphQLString },
            data: { type: GraphQLString },
        },
        resolve: async (
            _: any,
            {
                sequenceId,
                title,
                fromName,
                fromEmail,
                trigger,
                filter,
                data,
            }: {
                sequenceId: string;
                title?: string;
                fromName?: string;
                fromEmail?: string;
                trigger?: (typeof Constants.eventTypes)[number];
                filter?: string;
                data?: string;
            },
            context: GQLContext,
        ) =>
            updateSequence({
                ctx: context,
                sequenceId,
                title,
                fromName,
                fromEmail,
                trigger,
                filter,
                data,
            }),
    },
    startSequence: {
        type: types.sequence,
        args: {
            sequenceId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            { sequenceId }: { sequenceId: string },
            context: GQLContext,
        ) =>
            startSequence({
                ctx: context,
                sequenceId,
            }),
    },
    toggleEmailPublishStatus: {
        type: types.sequence,
        args: {
            sequenceId: { type: new GraphQLNonNull(GraphQLString) },
            emailId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            { sequenceId, emailId }: { sequenceId: string; emailId: string },
            context: GQLContext,
        ) =>
            toggleEmailPublishStatus({
                ctx: context,
                sequenceId,
                emailId,
            }),
    },
    // updateMail: {
    //     type: types.mail,
    //     args: {
    //         mailData: {
    //             type: new GraphQLNonNull(types.mailUpdate),
    //         },
    //     },
    //     resolve: async (
    //         _: any,
    //         {
    //             mailData,
    //         }: { mailData: Pick<Mail, "mailId" | "to" | "subject" | "body"> },
    //         context: GQLContext,
    //     ) => updateMail(mailData, context),
    // },
    // sendMail: {
    //     type: types.mail,
    //     args: {
    //         mailId: {
    //             type: new GraphQLNonNull(GraphQLString),
    //         },
    //     },
    //     resolve: async (
    //         _: any,
    //         { mailId }: { mailId: string },
    //         context: GQLContext,
    //     ) => sendMail(mailId, context),
    // },
    sendCourseOverMail: {
        type: GraphQLBoolean,
        args: {
            courseId: { type: new GraphQLNonNull(GraphQLString) },
            email: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            { courseId, email }: { courseId: string; email: string },
            context: GQLContext,
        ) => sendCourseOverMail(courseId, email, context),
    },
};
export default mutations;
