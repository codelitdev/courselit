import { SiteInfo, Constants } from "@courselit/common-models";
import mongoose from "mongoose";
import { MediaSchema } from "./media";

export const SettingsSchema = new mongoose.Schema<SiteInfo>({
    title: { type: String },
    subtitle: { type: String },
    logo: MediaSchema,
    currencyISOCode: { type: String, maxlength: 3 },
    paymentMethod: { type: String, enum: Constants.paymentMethods },
    stripeKey: { type: String },
    codeInjectionHead: { type: String },
    codeInjectionBody: { type: String },
    stripeSecret: { type: String },
    paytmSecret: { type: String },
    paypalSecret: { type: String },
    mailingAddress: { type: String },
    hideCourseLitBranding: { type: Boolean, default: false },
    razorpayKey: { type: String },
    razorpaySecret: { type: String },
    razorpayWebhookSecret: { type: String },
    lemonsqueezyKey: { type: String },
    lemonsqueezyStoreId: { type: String },
    lemonsqueezyWebhookSecret: { type: String },
    lemonsqueezyOneTimeVariantId: { type: String },
    lemonsqueezySubscriptionMonthlyVariantId: { type: String },
    lemonsqueezySubscriptionYearlyVariantId: { type: String },
    logins: { type: [String], enum: Object.values(Constants.LoginProvider) },
    ssoTrustedDomain: { type: String },
});
