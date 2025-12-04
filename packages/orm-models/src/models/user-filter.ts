import mongoose from "mongoose";
import {
    Constants,
    UserFilter,
    UserFilterWithAggregator,
} from "@courselit/common-models";

export const UserFilterSchema = new mongoose.Schema<UserFilter>({
    name: {
        type: String,
        required: true,
        enum: Object.values(Constants.UserFilter),
    },
    condition: { type: String, required: true },
    value: { type: String, required: true },
    valueLabel: { type: String },
});

export const UserFilterWithAggregatorSchema =
    new mongoose.Schema<UserFilterWithAggregator>({
        aggregator: {
            type: String,
            required: true,
            enum: Constants.userFilterAggregationOperators,
        },
        filters: [UserFilterSchema],
    });
