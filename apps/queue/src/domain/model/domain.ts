import { Domain as PublicDomain } from "@courselit/common-models";
import mongoose, { Document, Model } from "mongoose";
import SettingsSchema from "./site-info";

export type DomainDocument = Document &
    PublicDomain & {
        _id: mongoose.Types.ObjectId;
        incrementEmailCount: () => Promise<DomainDocument>;
    };

const DomainSchema = new mongoose.Schema<DomainDocument>(
    {
        name: { type: String, required: true, unique: true },
        settings: SettingsSchema,
        quota: new mongoose.Schema<DomainDocument["quota"]>({
            mail: new mongoose.Schema<DomainDocument["quota"]["mail"]>({
                daily: { type: Number, default: 0 },
                monthly: { type: Number, default: 0 },
                dailyCount: { type: Number, default: 0 },
                monthlyCount: { type: Number, default: 0 },
                lastDailyCountUpdate: { type: Date, default: () => new Date() },
                lastMonthlyCountUpdate: {
                    type: Date,
                    default: () => new Date(),
                },
            }),
        }),
    },
    {
        timestamps: true,
    },
);

DomainSchema.methods.incrementEmailCount = async function (
    this: DomainDocument,
) {
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
        this.quota.mail.lastDailyCountUpdate = new Date();
    }

    if (thisMonth === lastMonthlyUpdate) {
        this.quota.mail.monthlyCount++;
    } else {
        this.quota.mail.monthlyCount = 1;
        this.quota.mail.lastMonthlyCountUpdate = new Date();
    }

    return this.save();
};

const DomainModel =
    (mongoose.models.Domain as Model<DomainDocument>) ||
    mongoose.model<DomainDocument>("Domain", DomainSchema);

export default DomainModel;
