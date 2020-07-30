/**
 * A model for the front-end theme. A theme is based on Material-ui.com theme framework.
 * Visit: https://material-ui.com/customization/theming/.
 *
 */
const mongoose = require("mongoose");

const ThemeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  active: { type: Boolean, required: true, default: false },
  styles: mongoose.Schema.Types.Mixed,
  screenshot: String,
  url: String,
});

module.exports = mongoose.model("Theme", ThemeSchema);
