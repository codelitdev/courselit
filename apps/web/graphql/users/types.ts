import {
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLID,
    GraphQLString,
    GraphQLBoolean,
    GraphQLInt,
    GraphQLList,
    GraphQLInputObjectType,
    GraphQLEnumType,
} from "graphql";
import mediaTypes from "../media/types";
import { getMedia } from "../media/logic";
import { Constants } from "@courselit/common-models";

const memberStatusMap = {};
for (const status of [
    Constants.MembershipStatus.PENDING,
    Constants.MembershipStatus.ACTIVE,
    Constants.MembershipStatus.REJECTED,
    Constants.MembershipStatus.EXPIRED,
    Constants.MembershipStatus.PAYMENT_FAILED,
    Constants.MembershipStatus.PAUSED,
]) {
    memberStatusMap[status.toUpperCase()] = { value: status };
}

const membershipStatusType = new GraphQLEnumType({
    name: "MembershipStatusType",
    values: Object.fromEntries(
        Object.entries(Constants.MembershipStatus).map(([key, value]) => [
            key,
            { value: value },
        ]),
    ),
});

const membershipEntityType = new GraphQLEnumType({
    name: "MembershipEntityType",
    values: Object.fromEntries(
        Object.entries(Constants.MembershipEntityType).map(([key, value]) => [
            key,
            { value: value },
        ]),
    ),
});

const membershipRoleType = new GraphQLEnumType({
    name: "MembershipRoleType",
    values: Object.fromEntries(
        Object.entries(Constants.MembershipRole).map(([key, value]) => [
            key,
            { value: value },
        ]),
    ),
});

const progress = new GraphQLObjectType({
    name: "Progress",
    fields: {
        courseId: { type: new GraphQLNonNull(GraphQLString) },
        completedLessons: { type: new GraphQLList(GraphQLString) },
        accessibleGroups: { type: new GraphQLList(GraphQLString) },
        certificateId: { type: GraphQLString },
    },
});

const entityType = new GraphQLObjectType({
    name: "EntityType",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        slug: { type: GraphQLString },
        membersCount: { type: GraphQLInt },
        totalLessons: { type: GraphQLInt },
        completedLessonsCount: { type: GraphQLInt },
        featuredImage: {
            type: mediaTypes.mediaType,
            resolve: (content, args, context, info) =>
                getMedia(content.featuredImage),
        },
        type: { type: GraphQLString },
        certificateId: { type: GraphQLString },
    },
});

const userContent = new GraphQLObjectType({
    name: "UserContent",
    fields: {
        entityType: { type: new GraphQLNonNull(membershipEntityType) },
        entity: { type: entityType },
    },
});

const userType = new GraphQLObjectType({
    name: "User",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString },
        purchases: { type: new GraphQLList(progress) },
        active: { type: GraphQLBoolean },
        userId: { type: new GraphQLNonNull(GraphQLString) },
        bio: { type: GraphQLString },
        permissions: { type: new GraphQLList(GraphQLString) },
        subscribedToUpdates: { type: GraphQLBoolean },
        createdAt: { type: GraphQLString },
        updatedAt: { type: GraphQLString },
        tags: { type: new GraphQLList(GraphQLString) },
        avatar: {
            type: mediaTypes.mediaType,
            resolve: (user, _, __, ___) => getMedia(user.avatar),
        },
        content: { type: new GraphQLList(userContent) },
    },
});

const userUpdateInput = new GraphQLInputObjectType({
    name: "UserUpdateInput",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        active: { type: GraphQLBoolean },
        bio: { type: GraphQLString },
        permissions: { type: new GraphQLList(GraphQLString) },
        subscribedToUpdates: { type: GraphQLBoolean },
        tags: { type: new GraphQLList(GraphQLString) },
        avatar: {
            type: mediaTypes.mediaInputType,
        },
    },
});

const userPurchaseInput = new GraphQLObjectType({
    name: "UserPurchaseInput",
    fields: {
        courseId: { type: new GraphQLNonNull(GraphQLInt) },
    },
});

const userFilter = new GraphQLObjectType({
    name: "UserFilter",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        condition: { type: new GraphQLNonNull(GraphQLString) },
        value: { type: new GraphQLNonNull(GraphQLString) },
        valueLabel: { type: GraphQLString },
    },
});

const userFilterInput = new GraphQLInputObjectType({
    name: "UserFilterInput",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        condition: { type: new GraphQLNonNull(GraphQLString) },
        value: { type: new GraphQLNonNull(GraphQLString) },
        valueLabel: { type: GraphQLString },
    },
});

const createSegmentInput = new GraphQLInputObjectType({
    name: "CreateSegmentInput",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        filter: { type: new GraphQLNonNull(GraphQLString) },
    },
});

const filter = new GraphQLObjectType({
    name: "Filter",
    fields: {
        aggregator: { type: new GraphQLNonNull(GraphQLString) },
        filters: { type: new GraphQLList(userFilter) },
    },
});

const filterInput = new GraphQLInputObjectType({
    name: "FilterInput",
    fields: {
        aggregator: { type: new GraphQLNonNull(GraphQLString) },
        filters: { type: new GraphQLList(userFilterInput) },
    },
});

const userSegment = new GraphQLObjectType({
    name: "UserSegment",
    fields: {
        segmentId: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        filter: { type: filter },
    },
});

const tagWithDetails = new GraphQLObjectType({
    name: "TagWithDetails",
    fields: {
        tag: { type: new GraphQLNonNull(GraphQLString) },
        count: { type: new GraphQLNonNull(GraphQLString) },
    },
});

const certificateType = new GraphQLObjectType({
    name: "Certificate",
    fields: {
        certificateId: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        subtitle: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: new GraphQLNonNull(GraphQLString) },
        signatureName: { type: new GraphQLNonNull(GraphQLString) },
        productTitle: { type: new GraphQLNonNull(GraphQLString) },
        userName: { type: new GraphQLNonNull(GraphQLString) },
        createdAt: { type: new GraphQLNonNull(GraphQLString) },
        productPageId: { type: new GraphQLNonNull(GraphQLString) },
        signatureImage: { type: mediaTypes.mediaType },
        signatureDesignation: { type: GraphQLString },
        logo: { type: mediaTypes.mediaType },
        userImage: { type: mediaTypes.mediaType },
    },
});

const userTypes = {
    filter,
    filterInput,
    userType,
    userUpdateInput,
    userPurchaseInput,
    userSegment,
    userFilter,
    userFilterInput,
    createSegmentInput,
    tagWithDetails,
    userContent,
    membershipStatusType,
    membershipEntityType,
    membershipRoleType,
    certificateType,
};

export default userTypes;
