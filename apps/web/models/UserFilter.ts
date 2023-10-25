import mongoose from "mongoose";

export interface UserFilter {
    name: string;
    condition: string;
    value: string;
}

const UserFilterSchema = new mongoose.Schema<UserFilter>({
    name: { type: String, required: true },
    condition: { type: String, required: true },
    value: { type: String, required: true },
});

export interface UserFilterWithAggregator {
    aggregator: "and" | "or";
    filters: UserFilter[];
}

export const UserFilterWithAggregatorSchema =
    new mongoose.Schema<UserFilterWithAggregator>({
        aggregator: {
            type: String,
            required: true,
            enum: ["and", "or"],
        },
        filters: [UserFilterSchema],
    });

export default UserFilterSchema;
