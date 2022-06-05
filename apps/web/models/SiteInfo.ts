import mongoose from "mongoose";

export interface Settings {
    title?: string;
    subtitle?: string;
    logopath?: string;
    currencyUnit?: string;
    currencyISOCode?: string;
    paymentMethod?: string;
    stripePublishableKey?: string;
    codeInjectionHead?: string;
    stripeSecret?: string;
    paytmSecret?: string;
    paypalSecret?: string;
}

const SettingsSchema = new mongoose.Schema<Settings>({
    title: { type: String },
    subtitle: { type: String },
    logopath: { type: String },
    currencyUnit: { type: String },
    currencyISOCode: { type: String, maxlength: 3 },
    paymentMethod: { type: String },
    stripePublishableKey: { type: String },
    codeInjectionHead: { type: String },
    stripeSecret: { type: String },
    paytmSecret: { type: String },
    paypalSecret: { type: String },
});

export default SettingsSchema;
