import mongoose from "mongoose";
import { SettingsSchema } from "./site-info";
import {
    Constants,
    Features,
    Domain as PublicDomain,
    Typeface,
} from "@courselit/common-models";
import { TypefaceSchema } from "./typeface";

export interface Domain extends PublicDomain {
    _id: mongoose.Types.ObjectId;
    lastEditedThemeId?: string;
    features?: Features[];
}

export const defaultTypeface: Typeface = {
    section: "default",
    typeface: "Roboto",
    fontWeights: [300, 400, 500, 700],
    fontSize: 0,
    lineHeight: 0,
    letterSpacing: 0,
    case: "captilize",
};

export const DomainSchema = new mongoose.Schema<Domain>(
    {
        name: { type: String, required: true, unique: true },
        customDomain: { type: String, unique: true, sparse: true },
        email: { type: String, required: true },
        deleted: { type: Boolean, required: true, default: false },
        settings: SettingsSchema,
        themeId: { type: String },
        lastEditedThemeId: { type: String },
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
        features: {
            type: [String],
            enum: Object.values(Constants.Features),
            default: [],
        },
    },
    {
        timestamps: true,
    },
);
