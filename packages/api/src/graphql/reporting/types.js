const graphql = require("graphql");

const userPurchasesType = graphql.GraphQLObjectType({
  name: "UserPurchases",
  fields: {
    courseId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    purchasedOn: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    purchasedBy: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    paymentMethod: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    paymentId: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    amount: { type: new graphql.GraphQLNonNull(graphql.GraphQLFloat) },
    discount: { type: graphql.GraphQLFloat },
  },
});

module.exports = {
  userPurchasesType,
};
