/**
 * This middleware verifies if the subdomain exists in the system.
 */

const Domain = require("../models/Domain.js");
const responses = require("../config/strings.js").responses;

module.exports = async (req, res, next) => {
  const domainName = req.subdomains[0];

  if (!domainName) {
    res.status(400).json({ message: responses.domain_missing });
    return next(responses.domain_missing);
  }

  const domain = await Domain.findOne({ name: domainName });

  if (!domain) {
    res.status(400).json({ message: responses.domain_doesnt_exist });
    return next(responses.domain_doesnt_exist);
  } else {
    req.domain = domain;
    next();
  }
};
