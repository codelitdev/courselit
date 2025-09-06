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
        entityType: {
            type: String,
            required: true,
            enum: ["course", "community"],
        },
    },
    {
        timestamps: true,
    },
);
const PaymentPlan = mongoose.model("PaymentPlan", PaymentPlanSchema);

const CourseSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        courseId: { type: String, required: true, default: generateUniqueId },
        paymentPlans: [String],
        defaultPaymentPlan: { type: String },
    },
    {
        timestamps: true,
    },
);
const Course = mongoose.model("Course", CourseSchema);

const CommunitySchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        communityId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        paymentPlans: [String],
        defaultPaymentPlan: { type: String },
    },
    {
        timestamps: true,
    },
);
const Community = mongoose.model("Community", CommunitySchema);

const migratePaymentPlansOfProducts = async () => {
    console.log("🏁 Migrating payment plans of products");
    const courses = await Course.find({});
    for (const course of courses) {
        const paymentPlans = await PaymentPlan.find({
            domain: course.domain,
            planId: { $in: course.paymentPlans },
        });

        for (const paymentPlan of paymentPlans) {
            paymentPlan.entityId = course.courseId;
            paymentPlan.entityType = "course";
            console.log(
                `Updating payment plan ${paymentPlan.planId} for product ${course.courseId}`,
            );
            await paymentPlan.save();
        }

        // delete paymentPlans property from course
        course.paymentPlans = undefined;
        await course.save();
    }
    console.log("✅ Migrating payment plans of products completed\n");
};

const migratePaymentPlansOfCommunities = async () => {
    console.log("🏁 Migrating payment plans of communities");
    const communities = await Community.find({});
    for (const community of communities) {
        const paymentPlans = await PaymentPlan.find({
            domain: community.domain,
            planId: { $in: community.paymentPlans },
        });

        for (const paymentPlan of paymentPlans) {
            paymentPlan.entityId = community.communityId;
            paymentPlan.entityType = "community";
            console.log(
                `Updating payment plan ${paymentPlan.planId} for community ${community.communityId}`,
            );
            await paymentPlan.save();
        }

        // delete paymentPlans property from community
        community.paymentPlans = undefined;
        await community.save();
    }
    console.log("✅ Migrating payment plans of communities completed\n");
};

const migratePaymentPlans = async () => {
    await migratePaymentPlansOfProducts();
    await migratePaymentPlansOfCommunities();
};

(async () => {
    await migratePaymentPlans();
    mongoose.connection.close();
})();
