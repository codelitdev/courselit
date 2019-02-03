/**
 * Database configuration for Mongo DB
 */

const mongoose = require('mongoose')
const constants = require('./constants.js')

module.exports = mongoose
  .connect(
    `mongodb://${constants.dbURL}/${constants.dbName}`,
    { useNewUrlParser: true, useCreateIndex: true }
  )
