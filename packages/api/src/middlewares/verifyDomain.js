/**
 * This middleware verifies if the subdomain exists in the system.
 */

const Domain = require("../models/Domain.js");
const Subscriber = require("../models/Subscriber.js");
const responses = require("../config/strings.js").responses;
const {
  domainNameForSingleTenancy,
  placeholderEmailForSingleTenancy,
} = require("../config/constants.js");
const { isSubscriptionValid } = require("../lib/utils.js");

const getDomainBasedOnSubdomain = async (subdomain) => {
  return await Domain.findOne({ name: subdomain, deleted: false });
};

const getDomainBasedOnCustomDomain = async (customDomain) => {
  return await Domain.findOne({ customDomain, deleted: false });
};

const getDomain = async ({ hostName, domainName }) => {
  const domainBoundToLiveWebsite = new RegExp(`${process.env.DOMAIN}$`);

  if (
    process.env.NODE_ENV === "production" &&
    !domainBoundToLiveWebsite.test(hostName)
  ) {
    return await getDomainBasedOnCustomDomain(hostName);
  } else {
    return await getDomainBasedOnSubdomain(domainName);
  }
};

const hasValidSubscription = async (email) => {
  const subscriber = await Subscriber.findOne({ email });

  if (!subscriber) {
    return false;
  }

  if (!isSubscriptionValid(subscriber.subscriptionEndsAfter)) {
    return false;
  }

  return true;
};

module.exports = async (req, res, next) => {
  if (process.env.MULTITENANT === "true") {
    const domainName = req.subdomains[0];

    if (!domainName) {
      res.status(400).json({ message: responses.domain_missing });
      return next(responses.domain_missing);
    }

    const domain = await getDomain({
      hostName: req.hostname,
      domainName,
    });

    if (!domain) {
      res.status(400).json({ message: responses.domain_doesnt_exist });
      return next(responses.domain_doesnt_exist);
    }

    const validSubscription = await hasValidSubscription(domain.email);
    if (!validSubscription) {
      res.status(403).json({ message: responses.not_valid_subscription });
      return next(responses.not_valid_subscription);
    }

    req.subdomain = domain;
    next();
  } else {
    let domain = await Domain.findOne({ name: domainNameForSingleTenancy });

    if (!domain) {
      domain = await Domain.create({
        name: domainNameForSingleTenancy,
        email: placeholderEmailForSingleTenancy,
      });
    }

    req.subdomain = domain;
    next();
  }
};
