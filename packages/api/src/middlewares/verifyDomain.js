/**
 * This middleware verifies if the subdomain exists in the system.
 */

const Domain = require("../models/Domain.js");
const responses = require("../config/strings.js").responses;
const { domainNameForSingleTenancy } = require("../config/constants.js");

const getDomainBasedOnSubdomain = async (subdomain) => {
  return await Domain.findOne({ name: subdomain });
};

const getDomainBasedOnCustomDomain = async (customDomain) => {
  return await Domain.findOne({ customDomain });
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
    } else {
      req.domain = domain;
      next();
    }
  } else {
    let domain = await Domain.findOne({ name: domainNameForSingleTenancy });

    if (!domain) {
      domain = await Domain.create({ name: domainNameForSingleTenancy });
    }

    req.domain = domain;
    next();
  }
};
