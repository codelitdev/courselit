import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";
import WidgetSchema, { Widget } from "./Widget";
import constants from "../config/constants";
const { product, site } = constants;

export interface Page {
    id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    pageId: string;
    name: string;
    layout: Widget[];
    draftLayout: Widget[];
    type: typeof product | typeof site;
    creatorId: String;
    productId?: string;
}

const PageSchema = new mongoose.Schema<Page>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    pageId: { type: String, required: true, default: generateUniqueId },
    type: {
        type: String,
        required: true,
        enum: [product, site],
        default: product,
    },
    creatorId: { type: String, required: true },
    name: { type: String, required: true },
    layout: { type: [WidgetSchema], default: [] },
    draftLayout: { type: [WidgetSchema], default: [] },
    productId: { type: String },
});

export default mongoose.models.Page || mongoose.model("Page", PageSchema);
