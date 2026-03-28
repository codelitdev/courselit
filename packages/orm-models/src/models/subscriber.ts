import mongoose from "mongoose";

export interface Subscriber {
    subscriberId: string;
    name?: string;
    email: string;
}

export const SubscriberSchema = new mongoose.Schema({
    subscriberId: { type: String, required: true, unique: true },
    name: { type: String },
    email: { type: String, required: true, unique: true },
});
