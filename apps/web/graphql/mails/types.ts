import {
    GraphQLBoolean,
    GraphQLInputObjectType,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";
import GQLContext from "../../models/GQLContext";
import { getUser } from "../users/logic";
import userTypes from "../users/types";

const mail = new GraphQLObjectType({
    name: "Mail",
    fields: {
        mailId: { type: new GraphQLNonNull(GraphQLString) },
        to: { type: new GraphQLList(GraphQLString) },
        subject: { type: GraphQLString },
        body: { type: GraphQLString },
        user: {
            type: userTypes.userType,
            resolve: (mail, _, ctx: GQLContext, __) =>
                getUser(null, mail.creatorId, ctx),
        },
        published: { type: new GraphQLNonNull(GraphQLBoolean) },
        createdAt: { type: GraphQLString },
        updatedAt: { type: GraphQLString },
    },
});

const mailUpdate = new GraphQLInputObjectType({
    name: "MailUpdate",
    fields: {
        mailId: { type: new GraphQLNonNull(GraphQLString) },
        to: { type: new GraphQLList(GraphQLString) },
        subject: { type: GraphQLString },
        body: { type: GraphQLString },
    },
});

const mailSearchInput = new GraphQLInputObjectType({
    name: "MailSearchInput",
    fields: {
        searchText: { type: GraphQLString },
        offset: { type: GraphQLInt },
        rowsPerPage: { type: GraphQLInt },
    },
});

export default {
    mail,
    mailUpdate,
    mailSearchInput,
};
