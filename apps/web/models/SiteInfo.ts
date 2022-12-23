import { Media } from "@courselit/common-models";
import mongoose from "mongoose";
import MediaSchema from "./Media";

export interface Settings {
    title?: string;
    subtitle?: string;
    logo?: Media;
    currencyISOCode?: string;
    paymentMethod?: string;
    stripePublishableKey?: string;
    codeInjectionHead?: string;
    codeInjectionBody?: string;
    stripeSecret?: string;
    paytmSecret?: string;
    paypalSecret?: string;
}

const SettingsSchema = new mongoose.Schema<Settings>({
    title: { type: String },
    subtitle: { type: String },
    logo: MediaSchema,
    currencyISOCode: { type: String, maxlength: 3 },
    paymentMethod: { type: String },
    stripePublishableKey: { type: String },
    codeInjectionHead: { type: String },
    codeInjectionBody: { type: String },
    stripeSecret: { type: String },
    paytmSecret: { type: String },
    paypalSecret: { type: String },
});

export default SettingsSchema;
