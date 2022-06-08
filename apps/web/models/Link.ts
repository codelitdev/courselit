import mongoose from "mongoose";

export interface Link {
    id: mongoose.Types.ObjectId;
    // domain: mongoose.Types.ObjectId;
    text: string;
    destination: string;
    category: string;
    newTab: boolean;
}

const LinkSchema = new mongoose.Schema<Link>({
    text: { type: String, required: true },
    destination: { type: String, required: true },
    category: { type: String, required: true },
    newTab: { type: Boolean, required: true },
});

LinkSchema.index(
    { text: 1, destination: 1 },
    { unique: true }
)

// export default mongoose.models.Link || mongoose.model("Link", LinkSchema);
export default LinkSchema;
