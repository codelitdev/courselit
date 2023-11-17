import constants from "@config/constants";
import {
    GraphQLBoolean,
    GraphQLEnumType,
    GraphQLFloat,
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

const sequenceType = new GraphQLEnumType({
    name: "SequenceType",
    values: {
        BROADCAST: { value: constants.mailTypes[0] },
        SEQUENCE: { value: constants.mailTypes[1] },
    },
});

const sequenceEmail = new GraphQLObjectType({
    name: "SequenceEmail",
    fields: {
        emailId: { type: new GraphQLNonNull(GraphQLString) },
        templateId: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(GraphQLString) },
        subject: { type: new GraphQLNonNull(GraphQLString) },
        delayInMillis: { type: new GraphQLNonNull(GraphQLFloat) },
        published: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
});

const sequenceBroadcastSettings = new GraphQLObjectType({
    name: "SequenceBroadcastSettings",
    fields: {
        filter: { type: userTypes.filter },
    },
});

const sequenceBroadcastReport = new GraphQLObjectType({
    name: "SequenceBroadcastReport",
    fields: {
        sentAt: { type: GraphQLFloat },
        lockedAt: { type: GraphQLFloat },
    },
});

const sequenceSequenceReport = new GraphQLObjectType({
    name: "SequenceSequenceReport",
    fields: {
        subscribers: { type: new GraphQLList(GraphQLString) },
        unsubscribers: { type: new GraphQLList(GraphQLString) },
    },
});

const sequenceReport = new GraphQLObjectType({
    name: "SequenceReport",
    fields: {
        broadcast: { type: sequenceBroadcastReport },
        sequence: { type: sequenceSequenceReport },
    },
});

const sequence = new GraphQLObjectType({
    name: "Sequence",
    fields: {
        sequenceId: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(sequenceType) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        emails: { type: new GraphQLList(sequenceEmail) },
        creatorId: { type: new GraphQLNonNull(GraphQLString) },
        broadcastSettings: { type: sequenceBroadcastSettings },
        report: { type: sequenceReport },
    },
});

const sequenceList = new GraphQLObjectType({
    name: "SequenceList",
    fields: {
        sequenceId: { type: new GraphQLNonNull(GraphQLString) },
        //type: { type: new GraphQLNonNull(sequenceType) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        emails: { type: new GraphQLList(sequenceEmail) },
        //creatorId: { type: new GraphQLNonNull(GraphQLString) },
        //broadcastSettings: { type: sequenceBroadcastSettings },
    },
});

const sequenceInput = new GraphQLInputObjectType({
    name: "SequenceInput",
    fields: {
        sequenceId: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
    },
});

const types = {
    mail,
    mailUpdate,
    mailSearchInput,
    sequence,
    sequenceInput,
    sequenceType,
    sequenceList,
};
export default types;
