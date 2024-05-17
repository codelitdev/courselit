/**
 * A model for the front-end theme. A theme is based on Material-ui.com theme framework.
 * Visit: https://material-ui.com/customization/theming/.
 *
 */
import mongoose from "mongoose";
import { Theme } from "@courselit/common-models";

export const ThemeSchema = new mongoose.Schema<Theme>({
    name: { type: String, required: true },
    active: { type: Boolean, required: true, default: false },
    styles: { type: mongoose.Schema.Types.Mixed, required: true },
    screenshot: String,
    url: String,
});

export default mongoose.models.Theme || mongoose.model("Theme", ThemeSchema);
