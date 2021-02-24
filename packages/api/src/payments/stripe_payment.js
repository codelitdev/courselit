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

  async initiate({ course, currency, metadata, purchaseId }) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
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
      event.data &&
      event.data.object &&
      event.data.object.object === "checkout.session" &&
      event.data.object.payment_status === "paid"
    );
  }

  getPaymentIdentifier(event) {
    return event.data.object.metadata.purchaseId;
  }
}

module.exports = StripePayment;
