const graphql = require('graphql')
const {
  paypal,
  stripe,
  unpaid,
  paytm,
  other
} = require('../../config/constants.js')

const paymentMethodType = new graphql.GraphQLEnumType({
  name: 'PaymentMethodType',
  values: {
    PAYPAL: { value: paypal },
    STRIPE: { value: stripe },
    PAYTM: { value: paytm },
    OTHER: { value: other },
    UNPAID: { value: unpaid }
  }
})

const userType = new graphql.GraphQLObjectType({
  name: 'User',
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    email: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    purchases: { type: new graphql.GraphQLList(graphql.GraphQLID) },
    active: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    verified: { type: graphql.GraphQLBoolean },
    isCreator: { type: graphql.GraphQLBoolean },
    isAdmin: { type: graphql.GraphQLBoolean },
    avatar: { type: graphql.GraphQLString }
  }
})

const userUpdateInput = new graphql.GraphQLInputObjectType({
  name: 'UserUpdateInput',
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    name: { type: graphql.GraphQLString },
    avatar: { type: graphql.GraphQLString },
    isCreator: { type: graphql.GraphQLBoolean },
    isAdmin: { type: graphql.GraphQLBoolean },
    active: { type: graphql.GraphQLBoolean },
    password: { type: graphql.GraphQLString }
  }
})

const userSearchInput = new graphql.GraphQLInputObjectType({
  name: 'UserSearchInput',
  fields: {
    offset: { type: graphql.GraphQLInt },
    searchText: { type: graphql.GraphQLString }
  }
})

const usersSummaryType = new graphql.GraphQLObjectType({
  name: 'UsersSummary',
  fields: {
    count: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) },
    verified: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) },
    admins: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) },
    creators: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) }
  }
})

const userPurchaseInput = new graphql.GraphQLObjectType({
  name: 'UserPurchaseInput',
  fields: {
    courseId: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    purchasedOn: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    purchasedBy: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    paymentMethod: { type: new graphql.GraphQLNonNull(paymentMethodType) },
    paymentId: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    amount: { type: new graphql.GraphQLNonNull(graphql.GraphQLFloat) },
    discount: { type: graphql.GraphQLFloat }
  }
})

module.exports = {
  userType,
  userUpdateInput,
  userSearchInput,
  usersSummaryType,
  userPurchaseInput
}
