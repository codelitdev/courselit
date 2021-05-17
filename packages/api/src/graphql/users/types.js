const graphql = require("graphql");

const userType = new graphql.GraphQLObjectType({
  name: "User",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    email: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    name: { type: graphql.GraphQLString },
    purchases: { type: new graphql.GraphQLList(graphql.GraphQLID) },
    active: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    userId: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) },
    avatar: { type: graphql.GraphQLString },
    bio: { type: graphql.GraphQLString },
    permissions: { type: new graphql.GraphQLList(graphql.GraphQLString) },
  },
});

const userUpdateInput = new graphql.GraphQLInputObjectType({
  name: "UserUpdateInput",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    name: { type: graphql.GraphQLString },
    avatar: { type: graphql.GraphQLString },
    active: { type: graphql.GraphQLBoolean },
    password: { type: graphql.GraphQLString },
    bio: { type: graphql.GraphQLString },
    permissions: { type: new graphql.GraphQLList(graphql.GraphQLString) },
  },
});

const userSearchInput = new graphql.GraphQLInputObjectType({
  name: "UserSearchInput",
  fields: {
    offset: { type: graphql.GraphQLInt },
    searchText: { type: graphql.GraphQLString },
  },
});

const usersSummaryType = new graphql.GraphQLObjectType({
  name: "UsersSummary",
  fields: {
    count: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) },
    admins: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) },
    creators: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) },
  },
});

const userPurchaseInput = new graphql.GraphQLObjectType({
  name: "UserPurchaseInput",
  fields: {
    courseId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    discountCode: { type: graphql.GraphQLString },
    purchasingFor: { type: graphql.GraphQLID },
  },
});

module.exports = {
  userType,
  userUpdateInput,
  userSearchInput,
  usersSummaryType,
  userPurchaseInput,
};
