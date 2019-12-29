const Payment = require('./payment.js')
const {
  stripe_invalid_settings: stripeInvalidSettings
} = require('../config/strings.js').responses
const stripeSDK = require('stripe')

class StripePayment extends Payment {
  constructor () {
    super()

    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
      throw new Error(stripeInvalidSettings)
    }

    this.secret_key = process.env.STRIPE_SECRET_KEY
    this.stripe = stripeSDK(this.secret_key)
  }

  async initiate (amount, currency) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency
    })

    return paymentIntent
  }

  verify () {

  }
}

module.exports = StripePayment
