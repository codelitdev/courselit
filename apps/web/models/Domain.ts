import mongoose from "mongoose";
import SettingsSchema from "./SiteInfo";
import { ThemeSchema } from "./Theme";
import TypefaceSchema from "./Typeface";
import constants from "../config/constants";
import { Domain as PublicDomain, Typeface } from "@courselit/common-models";
const { typeface } = constants;

export interface Domain extends PublicDomain {
    _id: mongoose.Types.ObjectId;
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
        sharedWidgets: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        draftSharedWidgets: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        typefaces: {
            type: [TypefaceSchema],
            default: [defaultTypeface],
        },
        draftTypefaces: {
            type: [TypefaceSchema],
            default: [defaultTypeface],
        },
        firstRun: { type: Boolean, required: true, default: false },
        tags: { type: [String], default: [] },
        checkSubscriptionStatusAfter: { type: Date },
        quota: new mongoose.Schema<Domain["quota"]>({
            mail: new mongoose.Schema<Domain["quota"]["mail"]>({
                daily: { type: Number, default: 0 },
                monthly: { type: Number, default: 0 },
                dailyCount: { type: Number, default: 0 },
                monthlyCount: { type: Number, default: 0 },
                lastDailyCountUpdate: { type: Date, default: Date.now },
                lastMonthlyCountUpdate: { type: Date, default: Date.now },
            }),
        }),
    },
    {
        timestamps: true,
    },
);

export default mongoose.models.Domain || mongoose.model("Domain", DomainSchema);
