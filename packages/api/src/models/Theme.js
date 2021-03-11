/**
 * A model for the front-end theme. A theme is based on Material-ui.com theme framework.
 * Visit: https://material-ui.com/customization/theming/.
 *
 */
const mongoose = require("mongoose");

const ThemeSchema = new mongoose.Schema({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  active: { type: Boolean, required: true, default: false },
  styles: mongoose.Schema.Types.Mixed,
  screenshot: String,
  url: String,
});

ThemeSchema.index(
  {
    domain: 1,
    id: 1,
    name: 1,
  },
  { unique: true }
);

module.exports = mongoose.model("Theme", ThemeSchema);
