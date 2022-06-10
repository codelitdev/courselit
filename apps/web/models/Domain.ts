import { Layout } from "@courselit/common-models";
import mongoose from "mongoose";
import LayoutSchema from "./Layout";
import LinkSchema, { Link } from "./Link";
import SettingsSchema, { Settings } from "./SiteInfo";
import { Theme, ThemeSchema } from "./Theme";

export interface Domain {
    _id: mongoose.Types.ObjectId;
    name: string;
    customDomain: string;
    email: string;
    deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    settings: Settings;
    layout: Layout;
    theme: Theme;
    links: Link;
}

const DomainSchema = new mongoose.Schema<Domain>(
    {
        name: { type: String, required: true, unique: true },
        customDomain: { type: String, unique: true, sparse: true },
        email: { type: String, required: true },
        deleted: { type: Boolean, required: true, default: false },
        settings: SettingsSchema,
        layout: LayoutSchema,
        theme: ThemeSchema,
        links: [LinkSchema],
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Domain || mongoose.model("Domain", DomainSchema);
