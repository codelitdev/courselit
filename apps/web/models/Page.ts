import mongoose from "mongoose";
import WidgetSchema from "./Widget";
import constants from "../config/constants";
import {
    WidgetInstance,
    Page as PublicPage,
    Media,
} from "@courselit/common-models";
import MediaSchema from "./Media";
const { product, site, blogPage } = constants;

export interface Page extends PublicPage {
    id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    draftLayout: WidgetInstance[];
    creatorId: string;
    draftTitle?: string;
    draftDescription?: string;
    draftSocialImage?: Media;
    draftRobotsAllowed?: boolean;
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
        title: { type: String },
        description: String,
        socialImage: MediaSchema,
        robotsAllowed: { type: Boolean, default: true },
        draftTitle: String,
        draftDescription: String,
        draftSocialImage: MediaSchema,
        draftRobotsAllowed: Boolean,
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
