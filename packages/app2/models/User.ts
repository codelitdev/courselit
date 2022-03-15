import mongoose from "mongoose";
import AutoIncrementFactory from "mongoose-sequence";
const AutoIncrement = AutoIncrementFactory(mongoose);

export interface User {
  _id: mongoose.Types.ObjectId;
  domain: mongoose.Types.ObjectId;
  email: string;
  active: boolean;
  userId: number;
  name?: string;
  purchases: mongoose.Types.ObjectId[];
  bio?: string;
  permissions: string[];
}

const UserSchema = new mongoose.Schema<User>({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
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

if (!mongoose.models.User) {
  UserSchema.plugin(AutoIncrement, { inc_field: "userId" });
}

export default mongoose.models.User || mongoose.model("User", UserSchema);
