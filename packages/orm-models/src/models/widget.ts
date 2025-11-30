import { WidgetInstance } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export const WidgetSchema = new mongoose.Schema<WidgetInstance>({
    widgetId: { type: String, required: true, default: generateUniqueId },
    name: { type: String, required: true },
    deleteable: { type: Boolean, required: true, default: true },
    shared: { type: Boolean, required: true, default: false },
    settings: mongoose.Schema.Types.Mixed,
});

const WidgetModel =
    mongoose.models.Widget || mongoose.model("Widget", WidgetSchema);

export default WidgetModel;
