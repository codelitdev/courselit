const Payment = require("./payment.js");
const {
  stripe_invalid_settings: stripeInvalidSettings,
  currency_iso_not_set: currencyISONotSet,
} = require("../config/strings.js").responses;
const stripeSDK = require("stripe");
const SiteInfo = require("../models/SiteInfo.js");

class StripePayment extends Payment {
  async setup() {
    const siteinfo = (await SiteInfo.find())[0];

    if (!siteinfo.currencyISOCode) {
      throw new Error(currencyISONotSet);
    }

    if (!siteinfo.stripePublishableKey || !siteinfo.stripeSecret) {
      throw new Error(stripeInvalidSettings);
    }

    this.stripe = stripeSDK(siteinfo.stripeSecret);
    return this;
  }

  async initiate({ amount, currency, description, shipping }) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency,
      description,
      shipping,
      // {
      //   name: 'Some user',
      //   address: {
      //     line1: 'Shastri Nager',
      //     // postal_code: '122004',
      //     // city: 'Agra',
      //     // state: 'UP',
      //     // country: 'US'
      //   }
      // }
    });

    return paymentIntent.client_secret;
  }

  async verify(event) {
    return event.type === "payment_intent.succeeded";
  }

  getPaymentIdentifier(event) {
    return event.data.object.client_secret;
  }
}

module.exports = StripePayment;
