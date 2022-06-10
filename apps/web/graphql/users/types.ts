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

const { userTypeTeam, userTypeAudience } = constants;

const userType = new GraphQLObjectType({
    name: "User",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString },
        purchases: { type: new GraphQLList(GraphQLID) },
        active: { type: new GraphQLNonNull(GraphQLBoolean) },
        userId: { type: new GraphQLNonNull(GraphQLString) },
        bio: { type: GraphQLString },
        permissions: { type: new GraphQLList(GraphQLString) },
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
    },
});

const userGroupType = new GraphQLEnumType({
    name: "UserGroupType",
    values: {
        TEAM: { value: userTypeTeam },
        AUDIENCE: { value: userTypeAudience },
    },
});

const userSearchInput = new GraphQLInputObjectType({
    name: "UserSearchInput",
    fields: {
        offset: { type: GraphQLInt },
        searchText: { type: GraphQLString },
        type: { type: userGroupType },
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
