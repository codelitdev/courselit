const graphql = require('graphql')
const {
  paypal,
  stripe,
  paytm
} = require('../../config/constants.js')

const paymentMethodType = new graphql.GraphQLEnumType({
  name: 'PaymentMethod',
  values: {
    STRIPE: { value: stripe },
    PAYPAL: { value: paypal },
    PAYTM: { value: paytm }
  }
})

const settingsType = new graphql.GraphQLObjectType({
  name: 'Settings',
  fields: {
    paymentMethod: { type: paymentMethodType },
    stripeSecret: { type: graphql.GraphQLString },
    paytmSecret: { type: graphql.GraphQLString },
    paypalSecret: { type: graphql.GraphQLString }
  }
})

const settingsUpdateType = new graphql.GraphQLInputObjectType({
  name: 'SettingsUpdate',
  fields: {
    paymentMethod: { type: paymentMethodType },
    stripeSecret: { type: graphql.GraphQLString },
    paytmSecret: { type: graphql.GraphQLString },
    paypalSecret: { type: graphql.GraphQLString }
  }
})

module.exports = {
  settingsType,
  settingsUpdateType
}
