/**
 * A model for containing site information like site title etc.
 *
 * This will only contain one record.
 */
const mongoose = require("mongoose");

const SiteInfoSchema = new mongoose.Schema({
  domain: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  title: { type: String },
  subtitle: { type: String },
  logopath: { type: String },
  currencyUnit: { type: String },
  currencyISOCode: { type: String, maxlength: 3 },
  paymentMethod: { type: String },
  stripePublishableKey: { type: String },
  themePrimaryColor: { type: String },
  themeSecondaryColor: { type: String },
  codeInjectionHead: { type: String },
  stripeSecret: { type: String },
  paytmSecret: { type: String },
  paypalSecret: { type: String },
});

module.exports = mongoose.model("SiteInfo", SiteInfoSchema);
