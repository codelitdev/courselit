import { Domain as PublicDomain } from "@courselit/common-models";
import mongoose from "mongoose";
import SettingsSchema from "./site-info";

export interface Domain extends PublicDomain {
    _id: mongoose.Types.ObjectId;
}

const DomainSchema = new mongoose.Schema<Domain>(
    {
        name: { type: String, required: true, unique: true },
        settings: SettingsSchema,
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

DomainSchema.methods.incrementEmailCount = async function () {
    const today = new Date().toISOString().split("T")[0];
    const thisMonth = new Date().toISOString().slice(0, 7);
    const lastDailyUpdate = new Date(this.quota.mail.lastDailyCountUpdate)
        .toISOString()
        .split("T")[0];
    const lastMonthlyUpdate = new Date(this.quota.mail.lastMonthlyCountUpdate)
        .toISOString()
        .slice(0, 7);

    if (today === lastDailyUpdate) {
        this.quota.mail.dailyCount++;
    } else {
        this.quota.mail.dailyCount = 1;
        this.quota.mail.lastDailyCountUpdate = Date.now();
    }

    if (thisMonth === lastMonthlyUpdate) {
        this.quota.mail.monthlyCount++;
    } else {
        this.quota.mail.monthlyCount = 1;
        this.quota.mail.lastMonthlyCountUpdate = Date.now();
    }

    return this.save();
};

export default mongoose.models.Domain || mongoose.model("Domain", DomainSchema);
