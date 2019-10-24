/**
 * Database configuration for Mongo DB
 */

const mongoose = require('mongoose')
const constants = require('./constants.js')

module.exports = mongoose
  .connect(
    constants.dbConnectionString,
    { useNewUrlParser: true, useCreateIndex: true }
  )
