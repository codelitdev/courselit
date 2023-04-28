import { GraphQLBoolean, GraphQLNonNull, GraphQLString } from "graphql";
import GQLContext from "../../models/GQLContext";
import { createSubscription, createMail, updateMail, sendMail } from "./logic";
import types from "./types.ts";
import userTypes from "../users/types.ts";

export default {
    createSubscription: {
        type: GraphQLBoolean,
        args: {
            email: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            { email }: { email: string },
            context: GQLContext
        ) => createSubscription(email, context),
    },
    createMail: {
        type: types.mail,
        args: {
            searchData: { type: userTypes.userSearchInput },
        },
        resolve: async (
            _: any,
            { searchData }: { searchData: any },
            context: GQLContext
        ) => createMail(searchData, context),
    },
    updateMail: {
        type: types.mail,
        args: {
            mailData: {
                type: new GraphQLNonNull(types.mailUpdate),
            },
        },
        resolve: async (
            _: any,
            {
                mailData,
            }: { mailData: Pick<Mail, "mailId" | "to" | "subject" | "body"> },
            context: GQLContext
        ) => updateMail(mailData, context),
    },
    sendMail: {
        type: types.mail,
        args: {
            mailId: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: async (
            _: any,
            { mailId }: { mailId: string },
            context: GQLContext
        ) => sendMail(mailId, context),
    },
};
