const { debuggingEnabled } = require("../config/constants");

exports.info = (message, metadata = {}) => {
  console.info(message, metadata);
};

exports.error = (message, metadata = {}) => {
  console.error(message, metadata);
};

exports.debug = (message, metadata = {}) => {
  if (debuggingEnabled) {
    console.info(message, metadata);
  }
};
