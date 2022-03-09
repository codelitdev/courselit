const mongoose = require("mongoose");

const LinkSchema = new mongoose.Schema({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  text: { type: String, required: true },
  destination: { type: String, required: true },
  category: { type: String, required: true },
  newTab: { type: Boolean, required: true },
});

module.exports = mongoose.model("Link", LinkSchema);
