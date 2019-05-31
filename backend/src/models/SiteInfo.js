/**
 * A model for containing site information like site title etc.
 *
 * This will only contain one record.
 */
const mongoose = require('mongoose')

const SiteInfoSchema = new mongoose.Schema({
  title: { type: String },
  subtitle: { type: String },
  logopath: { type: String }
})

module.exports = mongoose.model('SiteInfo', SiteInfoSchema)
