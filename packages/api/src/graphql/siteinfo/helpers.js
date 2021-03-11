const { capitalize } = require("../../lib/utils.js");
const { paypal, stripe, paytm, none } = require("../../config/constants.js");
const { responses } = require("../../config/strings.js");

exports.checkForInvalidPaymentMethod = (siteInfo) => {
  if (!siteInfo.paymentMethod) {
    return;
  }

  if (![paypal, stripe, paytm, none].includes(siteInfo.paymentMethod)) {
    return new Error(responses.invalid_payment_method);
  }
};

exports.checkForInvalidPaymentSettings = (siteInfo) => {
  if (!siteInfo.paymentMethod) {
    return;
  }

  let failedPaymentMethod = null;

  if (siteInfo.paymentMethod === paytm && !siteInfo.paytmSecret) {
    failedPaymentMethod = paytm;
  }

  if (siteInfo.paymentMethod === paypal && !siteInfo.paypalSecret) {
    failedPaymentMethod = paypal;
  }

  if (
    siteInfo.paymentMethod === stripe &&
    !(siteInfo.stripeSecret && siteInfo.stripePublishableKey)
  ) {
    failedPaymentMethod = stripe;
  }

  return failedPaymentMethod;
};

exports.getPaymentInvalidException = (paymentMethod) =>
  new Error(
    `${capitalize(paymentMethod)} ${responses.payment_settings_invalid_suffix}`
  );
