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
        entityId: { type: String, required: true },
        internal: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    },
);
const PaymentPlan = mongoose.model("PaymentPlan", PaymentPlanSchema);

export const MembershipSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        membershipId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        paymentPlanId: { type: String, required: true },
        joiningReason: { type: String },
    },
    {
        timestamps: true,
    },
);
const Membership = mongoose.model("Membership", MembershipSchema);

const migrateInternalPaymentPlans = async () => {
    console.log("🏁 Migrating internal payment plans");
    const paymentPlans = await PaymentPlan.find({
        internal: true,
    });
    for (const paymentPlan of paymentPlans) {
        if (paymentPlan.entityId) continue;

        paymentPlan.entityId = "internal";
        await paymentPlan.save();
        console.log(`Updated payment plan ${paymentPlan.planId}`);
    }
    console.log("✅ Migrating internal payment plans completed\n");
};

const migrateMembershipOfCommunityCreators = async () => {
    console.log("🏁 Migrating membership of community creators");
    const paymentPlans = await PaymentPlan.find({
        internal: true,
    });
    for (const paymentPlan of paymentPlans) {
        const memberships = await Membership.find({
            domain: paymentPlan.domain,
            joiningReason: "Joined as creator",
        });
        for (const membership of memberships) {
            if (membership.paymentPlanId) continue;

            membership.paymentPlanId = paymentPlan.planId;
            await membership.save();
            console.log(
                `Updated membership ${membership.membershipId} with internal payment plan ${paymentPlan.planId}`,
            );
        }
    }
    console.log("✅ Migrating membership of community creators completed\n");
};

const migratePaymentPlansWithNoInternalProperty = async () => {
    console.log("🏁 Migrating payment plans with no internal property");
    const paymentPlans = await PaymentPlan.find({
        internal: { $exists: false },
    });
    for (const paymentPlan of paymentPlans) {
        paymentPlan.internal = false;
        await paymentPlan.save();
        console.log(`Updated payment plan ${paymentPlan.planId}`);
    }
    console.log(
        "✅ Migrating payment plans with no internal property completed\n",
    );
};

(async () => {
    await migrateInternalPaymentPlans();
    await migrateMembershipOfCommunityCreators();
    await migratePaymentPlansWithNoInternalProperty();
    mongoose.connection.close();
})();
