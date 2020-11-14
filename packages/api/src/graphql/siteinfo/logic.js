/**
 * Business logic for managing site information.
 */
const SiteInfo = require("../../models/SiteInfo.js");
const { checkIfAuthenticated } = require("../../lib/graphql.js");
const { responses } = require("../../config/strings.js");
const {
  currencyISOCodes,
  paypal,
  stripe,
  paytm,
  none,
} = require("../../config/constants.js");
const { capitalize } = require("../../lib/utils.js");

exports.getSiteInfo = async () => {
  const siteinfo = await SiteInfo.find(
    {},
    "title subtitle logopath currencyUnit currencyISOCode paymentMethod stripePublishableKey themePrimaryColor themeSecondaryColor codeInjectionHead"
  );

  return siteinfo[0];
};

exports.getSiteInfoAsAdmin = async (ctx) => {
  checkIfAuthenticated(ctx);

  if (!ctx.user.isAdmin) throw new Error(responses.is_not_admin);

  const siteinfo = await SiteInfo.find();
  return siteinfo[0];
};

exports.updateSiteInfo = async (siteData, ctx) => {
  checkIfAuthenticated(ctx);

  // check if the user is an admin
  if (!ctx.user.isAdmin) throw new Error(responses.is_not_admin);

  if (
    siteData.currencyISOCode &&
    !currencyISOCodes.includes(siteData.currencyISOCode.toLowerCase())
  ) {
    throw new Error(responses.unrecognised_currency_code);
  }

  let siteInfo = await SiteInfo.find();
  siteInfo = siteInfo[0];

  // create a new entry if not existing
  let shouldCreate = false;
  if (siteInfo === undefined) {
    shouldCreate = true;
    siteInfo = {};
  }

  // populate changed data
  for (const key of Object.keys(siteData)) {
    siteInfo[key] = siteData[key];
  }
  if (siteData.currencyISOCode) {
    siteInfo.currencyISOCode = siteData.currencyISOCode.toLowerCase();
  }

  const invalidPaymentMethod = checkForInvalidPaymentMethod(siteInfo);
  if (invalidPaymentMethod) {
    throw invalidPaymentMethod;
  }

  const failedPaymentMethod = checkForInvalidPaymentSettings(siteInfo);
  if (failedPaymentMethod) {
    throw getPaymentInvalidException(failedPaymentMethod);
  }

  if (shouldCreate) {
    siteInfo = await SiteInfo.create(siteInfo);
  } else {
    siteInfo = await siteInfo.save();
  }

  return siteInfo;
};

const checkForInvalidPaymentMethod = (siteInfo) => {
  if (!siteInfo.paymentMethod) {
    return;
  }

  if (![paypal, stripe, paytm, none].includes(siteInfo.paymentMethod)) {
    return new Error(responses.invalid_payment_method);
  }
};

const checkForInvalidPaymentSettings = (siteInfo) => {
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

const getPaymentInvalidException = (paymentMethod) =>
  new Error(
    `${capitalize(paymentMethod)} ${responses.payment_settings_invalid_suffix}`
  );
