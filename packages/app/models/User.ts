import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export interface User {
  id: mongoose.Types.ObjectId;
  domain: mongoose.Types.ObjectId;
  userId: string;
  email: string;
  active: boolean;
  name?: string;
  purchases: mongoose.Types.ObjectId[];
  bio?: string;
  permissions: string[];
}

const UserSchema = new mongoose.Schema<User>({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: String, required: true, default: generateUniqueId },
  email: { type: String, required: true },
  active: { type: Boolean, required: true, default: true },
  name: { type: String, required: false },
  purchases: [mongoose.Schema.Types.ObjectId],
  bio: { type: String },
  permissions: [String],
});

UserSchema.index({
  email: "text",
  name: "text",
});

UserSchema.index(
  {
    domain: 1,
    email: 1,
  },
  { unique: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
