import mongoose from "mongoose";
import SettingsSchema, { Settings } from "./SiteInfo";
import { Theme, ThemeSchema } from "./Theme";
import { Widget } from "./Widget";

interface SharedWidgets {
    [x: string]: Widget;
}

export interface Domain {
    _id: mongoose.Types.ObjectId;
    name: string;
    customDomain: string;
    email: string;
    deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    settings: Settings;
    theme: Theme;
    sharedWidgets: SharedWidgets;
    featureFlags: string[];
}

const DomainSchema = new mongoose.Schema<Domain>(
    {
        name: { type: String, required: true, unique: true },
        customDomain: { type: String, unique: true, sparse: true },
        email: { type: String, required: true },
        deleted: { type: Boolean, required: true, default: false },
        settings: SettingsSchema,
        theme: ThemeSchema,
        sharedWidgets: { type: mongoose.Schema.Types.Mixed, default: {} },
        featureFlags: { type: [String] },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Domain || mongoose.model("Domain", DomainSchema);
