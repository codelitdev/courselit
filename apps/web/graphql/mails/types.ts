import {
    GraphQLBoolean,
    GraphQLInputObjectType,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";

const mail = new GraphQLObjectType({
    name: "Mail",
    fields: {
        mailId: { type: new GraphQLNonNull(GraphQLString) },
        to: { type: new GraphQLList(GraphQLString) },
        subject: { type: GraphQLString },
        body: { type: GraphQLString },
        userId: { type: new GraphQLNonNull(GraphQLString) },
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
        offset: { type: GraphQLInt },
        searchText: { type: GraphQLString },
        rowsPerPage: { type: GraphQLInt },
    },
});

export default {
    mail,
    mailUpdate,
    mailSearchInput,
};
