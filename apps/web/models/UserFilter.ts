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

export default UserFilterSchema;
