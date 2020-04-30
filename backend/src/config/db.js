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
      serverSelectionTimeoutMS: 5000
    });
  } catch (err) {
    console.log(internalResponses.error_db_connection_failed, err);
    process.exit(1);
  }
}
