/**
 * A model for a widget.
 *
 */
const mongoose = require("mongoose");

const WidgetSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  settings: mongoose.Schema.Types.Mixed,
  data: mongoose.Schema.Types.Mixed,
});

module.exports = mongoose.model("Widget", WidgetSchema);
