import mongoose from "mongoose";

export interface SiteInfo {
  _id: mongoose.Types.ObjectId;
  domain: string;
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

const SiteInfoSchema = new mongoose.Schema<SiteInfo>({
  domain: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
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

export default mongoose.models.SiteInfo ||
  mongoose.model("SiteInfo", SiteInfoSchema);
