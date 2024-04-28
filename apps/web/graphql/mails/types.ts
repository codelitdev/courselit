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
import { Constants } from "@courselit/common-models";
import { GraphQLJSONObject } from "graphql-type-json";

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
        BROADCAST: { value: Constants.mailTypes[0] },
        SEQUENCE: { value: Constants.mailTypes[1] },
    },
});

const sequenceEmailActionType = new GraphQLEnumType({
    name: "SequenceEmailActionType",
    values: {
        TAG_ADD: { value: Constants.emailActionTypes[0] },
        TAG_REMOVE: { value: Constants.emailActionTypes[1] },
    },
});

const sequenceEmailAction = new GraphQLObjectType({
    name: "SequenceEmailAction",
    fields: {
        type: { type: new GraphQLNonNull(sequenceEmailActionType) },
        data: { type: new GraphQLNonNull(GraphQLString) },
    },
});

const sequenceEmail = new GraphQLObjectType({
    name: "SequenceEmail",
    fields: {
        emailId: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(GraphQLString) },
        subject: { type: new GraphQLNonNull(GraphQLString) },
        delayInMillis: { type: new GraphQLNonNull(GraphQLFloat) },
        published: { type: new GraphQLNonNull(GraphQLBoolean) },
        previewText: { type: GraphQLString },
        templateId: { type: GraphQLString },
        action: { type: sequenceEmailAction },
    },
});

const sequenceBroadcastReport = new GraphQLObjectType({
    name: "SequenceBroadcastReport",
    fields: {
        sentAt: { type: GraphQLFloat },
        lockedAt: { type: GraphQLFloat },
    },
});

const sequenceTriggerType = new GraphQLEnumType({
    name: "SequenceTriggerType",
    values: {
        TAG_ADDED: { value: Constants.eventTypes[0] },
        TAG_REMOVED: { value: Constants.eventTypes[1] },
        PRODUCT_PURCHASED: { value: Constants.eventTypes[2] },
        SUBSCRIBER_ADDED: { value: Constants.eventTypes[3] },
        DATE_OCCURRED: { value: Constants.eventTypes[4] },
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

const sequenceEmailFrom = new GraphQLObjectType({
    name: "SequenceEmailFrom",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: GraphQLString },
    },
});

const sequenceTrigger = new GraphQLObjectType({
    name: "SequenceTrigger",
    fields: {
        type: { type: sequenceTriggerType },
        data: { type: GraphQLString },
    },
});

const sequence = new GraphQLObjectType({
    name: "Sequence",
    fields: {
        sequenceId: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(sequenceType) },
        creatorId: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: GraphQLString },
        from: { type: sequenceEmailFrom },
        filter: { type: userTypes.filter },
        excludeFilter: { type: userTypes.filter },
        report: { type: sequenceReport },
        emails: { type: new GraphQLList(sequenceEmail) },
        status: { type: GraphQLString },
        trigger: { type: sequenceTrigger },
        data: { type: GraphQLJSONObject },
        emailsOrder: { type: new GraphQLList(GraphQLString) },
    },
});

const sequenceList = new GraphQLObjectType({
    name: "SequenceList",
    fields: {
        sequenceId: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        emails: { type: new GraphQLList(sequenceEmail) },
    },
});

const sequenceInput = new GraphQLInputObjectType({
    name: "SequenceInput",
    fields: {
        sequenceId: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
    },
});

const mailRequestStatusStatus = new GraphQLEnumType({
    name: "MailRequestStatusStatus",
    values: {
        PENDING: { value: Constants.mailRequestStatus[0] },
        APPROVED: { value: Constants.mailRequestStatus[1] },
        REJECTED: { value: Constants.mailRequestStatus[2] },
    },
});

const mailRequestStatus = new GraphQLObjectType({
    name: "MailRequestStatus",
    fields: {
        status: { type: mailRequestStatusStatus },
        message: { type: GraphQLString },
        reason: { type: GraphQLString },
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
    sequenceTrigger,
    sequenceTriggerType,
    sequenceEmailActionType,
    mailRequestStatus,
};
export default types;
