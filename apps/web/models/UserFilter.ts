import mongoose from "mongoose";

export interface UserFilter {
    emails?: Record<string, unknown>;
    products?: Record<string, unknown>;
    lastActive?: Record<string, unknown>;
    signedUp?: Record<string, unknown>;
    tags?: Record<string, unknown>;
    subscribedToUpdates?: boolean;
    permissions?: Record<string, unknown>;
}

const UserFilterSchema = new mongoose.Schema<UserFilter>({
    emails: mongoose.Schema.Types.Mixed,
    products: mongoose.Schema.Types.Mixed,
    lastActive: mongoose.Schema.Types.Mixed,
    signedUp: mongoose.Schema.Types.Mixed,
    tags: mongoose.Schema.Types.Mixed,
    subscribedToUpdates: Boolean,
    permissions: mongoose.Schema.Types.Mixed,
});

export default UserFilterSchema;
