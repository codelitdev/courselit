// create a free payment plan for all domains

import mongoose from "mongoose";
import { nanoid } from "nanoid";

function generateUniqueId() {
    return nanoid();
}

mongoose.connect(process.env.DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const PaymentPlanSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        planId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        name: { type: String, required: true },
        type: {
            type: String,
            required: true,
        },
        oneTimeAmount: { type: Number },
        emiAmount: { type: Number },
        emiTotalInstallments: { type: Number },
        subscriptionMonthlyAmount: { type: Number },
        subscriptionYearlyAmount: { type: Number },
        userId: { type: String, required: true },
        archived: { type: Boolean, default: false },
        internal: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    },
);

PaymentPlanSchema.pre("save", async function (next) {
    if (this.internal) {
        const existingInternalPlan = await this.constructor.findOne({
            domain: this.domain,
            internal: true,
            _id: { $ne: this._id },
        });

        if (existingInternalPlan) {
            const error = new Error(
                "Only one internal payment plan allowed per domain",
            );
            return next(error);
        }

        if (this.type !== "free") {
            const error = new Error("Internal payment plans must be free");
            return next(error);
        }
    }
    next();
});

const PaymentPlan = mongoose.model("PaymentPlan", PaymentPlanSchema);

const DomainSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
});

const Domain = mongoose.model("Domain", DomainSchema);

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, default: generateUniqueId },
    email: { type: String, required: true },
});
const User = mongoose.model("User", UserSchema);

const setupFreePayment = async () => {
    const domains = await Domain.find({}, { name: 1 });
    for (const domain of domains) {
        const creator = await User.findOne({
            domain: domain._id,
            permissions: { $elemMatch: { $eq: "site:manage" } },
        });
        const paymentPlan = await PaymentPlan.create({
            domain: domain._id,
            name: "Internal Payment Plan",
            internal: true,
            type: "free",
            userId: creator.userId,
        });
        console.log(
            `Added payment plan for '${domain.name}':`,
            paymentPlan.planId,
        );
    }
};

(async () => {
    await setupFreePayment();
    mongoose.connection.close();
})();
