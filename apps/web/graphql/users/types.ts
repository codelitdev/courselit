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
import constants from "../../config/constants";

const { userTypeTeam, userTypeCustomer, userTypeNewsletterSubscriber } =
    constants;

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

const userGroupType = new GraphQLEnumType({
    name: "UserGroupType",
    values: {
        TEAM: { value: userTypeTeam },
        CUSTOMER: { value: userTypeCustomer },
        SUBSCRIBER: { value: userTypeNewsletterSubscriber },
    },
});

const userSearchInput = new GraphQLInputObjectType({
    name: "UserSearchInput",
    fields: {
        searchText: { type: GraphQLString },
        type: { type: userGroupType },
        email: { type: GraphQLString },
        offset: { type: GraphQLInt },
        rowsPerPage: { type: GraphQLInt },
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

export default {
    userType,
    userUpdateInput,
    userSearchInput,
    usersSummaryType,
    userPurchaseInput,
};
