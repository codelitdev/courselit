const { paypal, stripe, paytm } = require("../config/constants.js");
const {
  error_unrecognised_payment_method: unrecognisedPaymentMethod,
  error_payment_method_not_implemented: notYetSupported,
} = require("../config/strings.js").internal;
const {
  update_payment_method: updatePaymentMethod,
} = require("../config/strings.js").responses;
const StripePayment = require("./stripe_payment.js");
const SiteInfo = require("../models/SiteInfo.js");

exports.getPaymentMethod = async (domain) => {
  const siteInfo = await SiteInfo.findOne({ domain });

  if (!siteInfo) {
    throw new Error(updatePaymentMethod);
  }

  switch (siteInfo.paymentMethod) {
    case paypal:
      throw new Error(notYetSupported);
    case stripe:
      return await new StripePayment(siteInfo).setup();
    case paytm:
      throw new Error(notYetSupported);
    default:
      throw new Error(unrecognisedPaymentMethod);
  }
};
