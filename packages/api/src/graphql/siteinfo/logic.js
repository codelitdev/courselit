/**
 * Business logic for managing site information.
 */
const SiteInfo = require("../../models/SiteInfo.js");
const { checkIfAuthenticated } = require("../../lib/graphql.js");
const { responses } = require("../../config/strings.js");
const { currencyISOCodes } = require("../../config/constants.js");
const {
  checkForInvalidPaymentMethod,
  checkForInvalidPaymentSettings,
  getPaymentInvalidException,
} = require("./helpers.js");

exports.getSiteInfo = async (ctx) => {
  const siteinfo = await SiteInfo.findOne(
    { domain: ctx.domain._id },
    "title subtitle logopath currencyUnit currencyISOCode paymentMethod stripePublishableKey themePrimaryColor themeSecondaryColor codeInjectionHead"
  );

  return siteinfo;
};

exports.getSiteInfoAsAdmin = async (ctx) => {
  checkIfAuthenticated(ctx);

  if (!ctx.user.isAdmin) throw new Error(responses.is_not_admin);

  const siteinfo = await SiteInfo.findOne({ domain: ctx.domain._id });
  return siteinfo;
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

  let siteInfo = await SiteInfo.findOne({ domain: ctx.domain._id });

  // create a new entry if not existing
  let shouldCreate = false;
  if (siteInfo === null) {
    shouldCreate = true;
    siteInfo = {
      domain: ctx.domain._id,
    };
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
