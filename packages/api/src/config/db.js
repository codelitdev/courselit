/**
 * Database configuration for Mongo DB
 */

const mongoose = require("mongoose");
const constants = require("./constants.js");
const internalResponses = require("./strings").internal;

module.exports = async () => {
  try {
    await mongoose.connect(constants.dbConnectionString, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.info(`Database connected.`);
  } catch (err) {
    console.error(internalResponses.error_db_connection_failed);
    console.error(`Additional info: ${err.message}`);
    process.exit(1);
  }
};
