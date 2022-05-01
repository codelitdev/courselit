import mongoose from "mongoose";

export interface Domain {
  _id: mongoose.Types.ObjectId;
  name: string;
  customDomain: string;
  email: string;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DomainSchema = new mongoose.Schema<Domain>(
  {
    name: { type: String, required: true, unique: true },
    customDomain: { type: String, unique: true, sparse: true },
    email: { type: String, required: true },
    deleted: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Domain || mongoose.model("Domain", DomainSchema);
