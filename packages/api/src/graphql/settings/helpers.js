const { capitalize } = require("../../lib/utils.js");
const {
  paypal,
  stripe,
  paytm,
  none,
  currencyISOCodes,
} = require("../../config/constants.js");
const { responses } = require("../../config/strings.js");

const verifyCurrencyISOCode = (isoCode) => {
  if (!currencyISOCodes.includes(isoCode.toLowerCase())) {
    throw new Error(responses.unrecognised_currency_code);
  }
};

const verifyCurrencyISOCodeBasedOnSiteInfo = (siteInfo) => {
  if (!siteInfo.paymentMethod) {
    if (siteInfo.currencyISOCode) {
      verifyCurrencyISOCode(siteInfo.currencyISOCode);
    }
  } else {
    if (!siteInfo.currencyISOCode) {
      throw new Error(responses.currency_iso_code_required);
    }

    verifyCurrencyISOCode(siteInfo.currencyISOCode);
  }
};

exports.checkForInvalidPaymentSettings = (siteInfo) => {
  verifyCurrencyISOCodeBasedOnSiteInfo(siteInfo);

  if (!siteInfo.paymentMethod) {
    return;
  }

  if (!siteInfo.currencyUnit) {
    return new Error(responses.currency_unit_required);
  }

  if (![paypal, stripe, paytm, none].includes(siteInfo.paymentMethod)) {
    return new Error(responses.invalid_payment_method);
  }
};

exports.checkForInvalidPaymentMethodSettings = (siteInfo) => {
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
