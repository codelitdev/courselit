import mongoose from "mongoose";
import { WidgetSchema } from "./widget";
import {
    WidgetInstance,
    Page as PublicPage,
    Media,
    Constants,
} from "@courselit/common-models";
import { MediaSchema } from "./media";

const { PageType } = Constants;

export interface InternalPage extends PublicPage {
    id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    draftLayout: WidgetInstance[];
    creatorId: string;
    draftTitle?: string;
    draftDescription?: string;
    draftSocialImage?: Media;
    draftRobotsAllowed?: boolean;
}

export const PageSchema = new mongoose.Schema<InternalPage>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        pageId: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: [
                PageType.PRODUCT,
                PageType.SITE,
                PageType.BLOG,
                PageType.COMMUNITY,
            ],
            default: PageType.PRODUCT,
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
        deleted: { type: Boolean, default: false },
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
