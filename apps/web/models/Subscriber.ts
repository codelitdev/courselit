import mongoose from "mongoose";

export interface Subscriber {
    subscriberId: string;
    name?: string;
    email: string;
}

const SubscriberSchema = new mongoose.Schema({
    subscriberId: { type: String, required: true, unique: true },
    name: { type: String },
    email: { type: String, required: true, unique: true },
});

export default mongoose.models.Subscriber ||
    mongoose.model("Subscriber", SubscriberSchema);
