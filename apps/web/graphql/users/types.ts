import {
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLID,
    GraphQLString,
    GraphQLBoolean,
    GraphQLInt,
    GraphQLList,
    GraphQLInputObjectType,
} from "graphql";

const progress = new GraphQLObjectType({
    name: "Progress",
    fields: {
        courseId: { type: new GraphQLNonNull(GraphQLString) },
        completedLessons: { type: new GraphQLList(GraphQLString) },
    },
});

const userType = new GraphQLObjectType({
    name: "User",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString },
        purchases: { type: new GraphQLList(progress) },
        active: { type: new GraphQLNonNull(GraphQLBoolean) },
        userId: { type: new GraphQLNonNull(GraphQLString) },
        bio: { type: GraphQLString },
        permissions: { type: new GraphQLList(GraphQLString) },
        subscribedToUpdates: { type: GraphQLBoolean },
        createdAt: { type: GraphQLString },
        updatedAt: { type: GraphQLString },
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
    },
});

const userSearchInput = new GraphQLInputObjectType({
    name: "UserSearchInput",
    fields: {
        //searchText: { type: GraphQLString },
        //type: { type: userGroupType },
        //email: { type: GraphQLString },
        offset: { type: GraphQLInt },
        rowsPerPage: { type: GraphQLInt },
        filters: { type: GraphQLString },
    },
});

const usersSummaryType = new GraphQLObjectType({
    name: "UsersSummary",
    fields: {
        count: { type: new GraphQLNonNull(GraphQLInt) },
        admins: { type: new GraphQLNonNull(GraphQLInt) },
        creators: { type: new GraphQLNonNull(GraphQLInt) },
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

const userSegment = new GraphQLObjectType({
    name: "UserSegment",
    fields: {
        segmentId: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        filter: { type: filter },
    },
});

const userTypes = {
    userType,
    userUpdateInput,
    userSearchInput,
    usersSummaryType,
    userPurchaseInput,
    userSegment,
    userFilter,
    createSegmentInput,
};

export default userTypes;
