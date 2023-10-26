import mongoose from "mongoose";
import UserFilterType from "./UserFilterType";
import constants from "@config/constants";
const { userFilters } = constants;

export interface UserFilter {
    name: UserFilterType;
    condition: string;
    value: string;
    valueLabel?: string;
}

const UserFilterSchema = new mongoose.Schema<UserFilter>({
    name: {
        type: String,
        required: true,
        enum: userFilters,
    },
    condition: { type: String, required: true },
    value: { type: String, required: true },
    valueLabel: { type: String },
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
