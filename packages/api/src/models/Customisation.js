const mongoose = require("mongoose");

const CustomisationSchema = new mongoose.Schema({
  // TODO: remove these two fields
  themePrimaryColor: { type: String },
  themeSecondaryColor: { type: String },

  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  codeInjectionHead: { type: String },
});

module.exports = mongoose.model("Customisation", CustomisationSchema);
