const mongoose = require('mongoose')

const SiteInfoSchema = mongoose.Schema({
  title: { type: String },
  subtitle: { type: String },
  logopath: { type: String }
})

module.exports = mongoose.model('SiteInfo', SiteInfoSchema)
