import { SiteInfo } from "@courselit/common-models";
import mongoose from "mongoose";
import MediaSchema from "./Media";

const SettingsSchema = new mongoose.Schema<SiteInfo>({
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
    mailingAddress: { type: String },
});

export default SettingsSchema;
