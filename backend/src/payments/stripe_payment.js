const Payment = require('./payment.js')
const {
  stripe_invalid_settings: stripeInvalidSettings
} = require('../config/strings.js').responses
const stripeSDK = require('stripe')
const Settings = require('../models/Settings.js')
const SiteInfo = require('../models/SiteInfo.js')

class StripePayment extends Payment {
  async setup () {
    const siteinfo = (await SiteInfo.find())[0]
    const settings = (await Settings.find())[0]

    if (
      !siteinfo.stripePublishableKey ||
      !settings.stripeSecret ||
      !siteinfo.currencyISOCode
    ) {
      throw new Error(stripeInvalidSettings)
    }

    this.stripe = stripeSDK(settings.stripeSecret)
    return this
  }

  async initiate (amount, currency) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency
    })

    return paymentIntent.client_secret
  }

  async verify (event) {
    return event.type === 'payment_intent.succeeded'
  }

  getPaymentIdentifier (event) {
    return event.data.object.client_secret
  }
}

module.exports = StripePayment
