/**
 * A model for the front-end layout.
 */
const mongoose = require("mongoose");

const LayoutSchema = new mongoose.Schema({
  domain: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  layout: mongoose.Schema.Types.Mixed,
});

module.exports = mongoose.model("Layout", LayoutSchema);
