import mongoose from "mongoose";
import SettingsSchema, { Settings } from "./SiteInfo";
import { Theme, ThemeSchema } from "./Theme";
import TypefaceSchema, { Typeface } from "./Typeface";
import { Widget } from "./Widget";
import constants from "../config/constants";
const { typeface } = constants;

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
    typefaces: Typeface[];
    draftTypefaces: Typeface[];
    firstRun: boolean;
}

export const defaultTypeface: Typeface = {
    section: "default",
    typeface: typeface,
    fontWeights: [300, 400, 500, 700],
    fontSize: 0,
    lineHeight: 0,
    letterSpacing: 0,
    case: "captilize",
};

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
        typefaces: {
            type: [TypefaceSchema],
            default: [defaultTypeface],
        },
        draftTypefaces: { type: [TypefaceSchema], default: [defaultTypeface] },
        firstRun: { type: Boolean, required: true, default: false },
    },
    {
        timestamps: true,
    },
);

export default mongoose.models.Domain || mongoose.model("Domain", DomainSchema);
