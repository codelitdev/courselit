import mongoose from "mongoose";
import WidgetSchema, { Widget } from "./Widget";
import constants from "../config/constants";
const { product, site, blogPage } = constants;

export interface Page {
    id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    pageId: string;
    name: string;
    layout: Widget[];
    draftLayout: Widget[];
    type: typeof product | typeof site | typeof blogPage;
    creatorId: String;
    entityId?: string;
}

const PageSchema = new mongoose.Schema<Page>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    pageId: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: [product, site, blogPage],
        default: product,
    },
    creatorId: { type: String, required: true },
    name: { type: String, required: true },
    layout: { type: [WidgetSchema], default: [] },
    draftLayout: { type: [WidgetSchema], default: [] },
    entityId: { type: String },
});

PageSchema.index(
    {
        domain: 1,
        pageId: 1,
    },
    { unique: true }
);

export default mongoose.models.Page || mongoose.model("Page", PageSchema);
