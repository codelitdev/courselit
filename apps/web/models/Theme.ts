/**
 * A model for the front-end theme. A theme is based on Material-ui.com theme framework.
 * Visit: https://material-ui.com/customization/theming/.
 *
 */
import mongoose from "mongoose";

export interface Theme {
    domain: mongoose.Types.ObjectId;
    id: string;
    name: string;
    active: boolean;
    styles: Record<string, unknown>;
    screenshot?: string;
    url?: string;
}

export const ThemeSchema = new mongoose.Schema<Theme>({
    domain: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    name: { type: String, required: true },
    active: { type: Boolean, required: true, default: false },
    styles: { type: mongoose.Schema.Types.Mixed, required: true },
    screenshot: String,
    url: String,
});

ThemeSchema.index(
    {
        domain: 1,
        name: 1,
    },
    { unique: true, sparse: true }
);

export default mongoose.models.Theme || mongoose.model("Theme", ThemeSchema);
