import mongoose from "mongoose";
import {
    Constants,
    UserFilter,
    UserFilterWithAggregator,
} from "@courselit/common-models";

const UserFilterSchema = new mongoose.Schema<UserFilter>({
    name: {
        type: String,
        required: true,
        enum: Constants.userFilters,
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

export default UserFilterSchema;
