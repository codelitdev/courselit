const mongoose = require("mongoose");

const CustomisationSchema = new mongoose.Schema({
  // TODO: remove these two fields
  themePrimaryColor: { type: String },
  themeSecondaryColor: { type: String },

  codeInjectionHead: { type: String },
});

module.exports = mongoose.model("Customisation", CustomisationSchema);
