const Payment = require("./payment.js");
const {
  stripe_invalid_settings: stripeInvalidSettings,
  currency_iso_not_set: currencyISONotSet,
} = require("../config/strings.js").responses;
const stripeSDK = require("stripe");
const { stripe } = require("../config/constants.js");

class StripePayment extends Payment {
  constructor(siteinfo) {
    super();
    this.siteinfo = siteinfo;
    this.name = stripe;
  }

  async setup() {
    if (!this.siteinfo.currencyISOCode) {
      throw new Error(currencyISONotSet);
    }

    if (!this.siteinfo.stripePublishableKey || !this.siteinfo.stripeSecret) {
      throw new Error(stripeInvalidSettings);
    }

    this.stripe = stripeSDK(this.siteinfo.stripeSecret);

    return this;
  }

  async initiate({ course, metadata, purchaseId }) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: this.siteinfo.currencyISOCode,
            product_data: {
              name: course.title,
            },
            unit_amount: course.cost * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${metadata.successUrl}?id=${purchaseId}&source=${metadata.sourceUrl}`,
      cancel_url: metadata.cancelUrl,
      metadata: {
        purchaseId,
      },
    });

    return session.id;
  }

  verify(event) {
    return (
      event &&
      event.type === "checkout.session.completed" &&
      event.data.object.payment_status === "paid"
    );
  }

  getPaymentIdentifier(event) {
    return event.data.object.metadata.purchaseId;
  }

  getName() {
    return this.name;
  }
}

module.exports = StripePayment;
