/**
 * A model for the front-end layout.
 */
const mongoose = require("mongoose");

const LayoutSchema = new mongoose.Schema({
  layout: mongoose.Schema.Types.Mixed,
});

module.exports = mongoose.model("Layout", LayoutSchema);
