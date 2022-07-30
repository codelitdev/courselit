import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export interface Widget {
    widgetId: string;
    name: string;
    deleteable: boolean;
    settings?: Record<string, unknown>;
}

const WidgetSchema = new mongoose.Schema<Widget>({
    widgetId: { type: String, required: true, default: generateUniqueId },
    name: { type: String, required: true },
    settings: mongoose.Schema.Types.Mixed,
    deleteable: { type: Boolean, required: true, default: true },
});

export default WidgetSchema;
