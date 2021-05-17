const {
  severityError,
  severityInfo,
  severityWarn,
} = require("../config/constants.js");
const Log = require("../models/Log.js");

exports.error = async (message, metadata) => {
  await Log.create({
    severity: severityError,
    message,
    metadata,
  });
};

exports.info = async (message, metadata) => {
  await Log.info({
    severity: severityInfo,
    message,
    metadata,
  });
};

exports.warn = async (message, metadata) => {
  await Log.info({
    severity: severityWarn,
    message,
    metadata,
  });
};
