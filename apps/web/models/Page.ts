import mongoose from "mongoose";
import WidgetSchema from "./Widget";
import constants from "../config/constants";
import { WidgetInstance, Page as PublicPage } from "@courselit/common-models";
const { product, site, blogPage } = constants;

export interface Page extends PublicPage {
    id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    draftLayout: WidgetInstance[];
    creatorId: string;
}

const PageSchema = new mongoose.Schema<Page>(
    {
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
        deleteable: { type: Boolean, required: true, default: false },
    },
    {
        timestamps: true,
    },
);

PageSchema.index(
    {
        domain: 1,
        pageId: 1,
    },
    { unique: true },
);

export default mongoose.models.Page || mongoose.model("Page", PageSchema);
