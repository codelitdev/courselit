import mongoose from "mongoose";
import { nanoid } from "nanoid";

function generateUniqueId() {
    return nanoid();
}

mongoose.connect(process.env.DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const DomainSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
});

const Domain = mongoose.model("Domain", DomainSchema);

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
            enum: ["free", "onetime"],
        },
        oneTimeAmount: { type: Number },
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

const CourseSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        courseId: { type: String, required: true, default: generateUniqueId },
        title: { type: String, required: true },
        cost: { type: Number, required: true },
        costType: {
            type: String,
            required: true,
            enum: ["free", "email", "paid"],
        },
        paymentPlans: [String],
        defaultPaymentPlan: { type: String },
        creatorId: { type: String, required: true },
        published: { type: Boolean, required: true, default: false },
        customers: { type: [String] },
    },
    {
        timestamps: true,
    },
);

const Course = mongoose.model("Course", CourseSchema);

const ProgressSchema = new mongoose.Schema(
    {
        courseId: { type: String, required: true },
        completedLessons: { type: [String] },
        downloaded: { type: Boolean },
        accessibleGroups: { type: [String] },
    },
    {
        timestamps: true,
    },
);

export const UserSchema = new mongoose.Schema({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: String, required: true },
    purchases: [ProgressSchema],
});

const User = mongoose.model("User", UserSchema);

const MembershipSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        membershipId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        userId: { type: String, required: true },
        paymentPlanId: String,
        entityId: { type: String, required: true },
        entityType: {
            type: String,
            enum: ["course", "community"],
            required: true,
        },
        sessionId: { type: String, required: true, default: generateUniqueId },
        status: {
            type: String,
            enum: ["active", "pending"],
            default: "pending",
        },
    },
    {
        timestamps: true,
    },
);

const Membership = mongoose.model("Membership", MembershipSchema);

const migratePurchasesToMemberships = async (user) => {
    const purchases = user.purchases;

    for (const purchase of purchases) {
        console.log(purchase.courseId);
        const course = await Course.findOne({
            courseId: purchase.courseId,
        });
        const paymentPlan = await getPaymentPlanType(course);
        console.log(
            user.userId,
            course.title,
            course.costType,
            course.cost,
            course.paymentPlans,
        );
        await createMembership(
            user.domain,
            user.userId,
            course.courseId,
            paymentPlan,
        );
    }
};

const createMembership = async (domain, userId, courseId, paymentPlan) => {
    const payload = {
        domain,
        userId,
        paymentPlanId: paymentPlan.planId,
        entityId: courseId,
        entityType: "course",
        status: "active",
    };

    const existingMembership = await Membership.findOne(payload);
    if (!existingMembership) {
        await Membership.create(payload);
    }
};

const getPaymentPlanType = async (course) => {
    const existingPlans = await PaymentPlan.find({
        domain: course.domain,
        userId: course.creatorId,
        planId: { $in: course.paymentPlans },
    });

    const type = course.costType === "paid" ? "onetime" : "free";

    const existingPlan = existingPlans.find((plan) => plan.type === type);

    if (existingPlan) {
        return existingPlan;
    }
};

const createOrFindPaymentPlan = async (course) => {
    const type = course.costType === "paid" ? "onetime" : "free";

    let paymentPlan = await getPaymentPlanType(course);
    if (paymentPlan) {
        return paymentPlan;
    }

    const payload = {
        domain: course.domain,
        name: course.costType === "paid" ? "Paid" : "Free",
        type,
        userId: course.creatorId,
        oneTimeAmount: course.costType === "paid" ? course.cost : undefined,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
    };

    paymentPlan = await PaymentPlan.create(payload);
    course.paymentPlans.push(paymentPlan.planId);
    course.defaultPaymentPlan = paymentPlan.planId;
    await course.save();

    return paymentPlan;
};

const migrateCustomersToMemberships = async () => {
    const usersWithPurchases = await User.find({
        purchases: { $exists: true, $ne: [] },
    });

    for (const user of usersWithPurchases) {
        await migratePurchasesToMemberships(user);
    }
};

const addPaymentPlansToPublishedCourses = async () => {
    const courses = await Course.find({
        $or: [{ published: true }, { customers: { $exists: true, $ne: [] } }],
    });

    for (const course of courses) {
        await createOrFindPaymentPlan(course);
    }
};

(async () => {
    await addPaymentPlansToPublishedCourses();
    await migrateCustomersToMemberships();
    mongoose.connection.close();
})();
