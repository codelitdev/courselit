/**
 * A model for a widget.
 *
 */
import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export interface Widget {
    widgetId: string;
    name: string;
    settings: Record<string, unknown>;
    data: Record<string, unknown>;
}

const WidgetSchema = new mongoose.Schema<Widget>({
    widgetId: { type: String, required: true, default: generateUniqueId },
    name: { type: String, required: true },
    settings: mongoose.Schema.Types.Mixed,
    data: mongoose.Schema.Types.Mixed,
});

export default WidgetSchema;
