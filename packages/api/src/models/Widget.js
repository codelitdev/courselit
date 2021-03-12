/**
 * A model for a widget.
 *
 */
const mongoose = require("mongoose");

const WidgetSchema = new mongoose.Schema({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  settings: mongoose.Schema.Types.Mixed,
  data: mongoose.Schema.Types.Mixed,
});

WidgetSchema.index(
  {
    domain: 1,
    name: 1,
  },
  { unique: true }
);

module.exports = mongoose.model("Widget", WidgetSchema);
