/**
 * A model for side wide settings that are only controlled by site admins.
 *
 * This will only contain one record.
 */
const mongoose = require('mongoose')

const SettingsSchema = new mongoose.Schema({
  stripeSecret: { type: String },
  paytmSecret: { type: String },
  paypalSecret: { type: String }
})

module.exports = mongoose.model('Settings', SettingsSchema)
