const { paypal, stripe, unpaid, paytm } = require("../config/constants.js");
const {
  error_unrecognised_payment_method: unrecognisedPaymentMethod,
  error_payment_method_not_implemented: notYetSupported
} = require("../config/strings.js").internal;
const StripePayment = require("./stripe_payment.js");

exports.getPaymentMethod = async methodName => {
  switch (methodName) {
    case paypal:
      throw new Error(notYetSupported);
    case stripe:
      return new StripePayment().setup();
    case paytm:
      throw new Error(notYetSupported);
    case unpaid:
      throw new Error(notYetSupported);
    default:
      throw new Error(unrecognisedPaymentMethod);
  }
};
