import mongoose from "mongoose";

const SubscriberSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true },
        stripeCustomerId: { type: String, unique: true, sparse: true },
        stripeSubscriptionId: { type: String, unique: true, sparse: true },
        subscriptionEndsAfter: { type: Date, required: true },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Subscriber ||
    mongoose.model("Subscriber", SubscriberSchema);
