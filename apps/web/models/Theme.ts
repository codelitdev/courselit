/**
 * A model for the front-end theme. A theme is based on Material-ui.com theme framework.
 * Visit: https://material-ui.com/customization/theming/.
 *
 */
import mongoose from "mongoose";

export interface Theme {
  domain: string;
  id: string;
  name: string;
  active: boolean;
  styles: Record<string, unknown>;
  screenshot?: string;
  url?: string;
}

const ThemeSchema = new mongoose.Schema({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  active: { type: Boolean, required: true, default: false },
  styles: { type: mongoose.Schema.Types.Mixed, required: true },
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

export default mongoose.models.Theme || mongoose.model("Theme", ThemeSchema);
