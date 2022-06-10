import mongoose from "mongoose";

export interface Link {
    id: mongoose.Types.ObjectId;
    text: string;
    destination: string;
    category: string;
    newTab: boolean;
    rank: number;
}

const LinkSchema = new mongoose.Schema<Link>({
    text: { type: String, required: true },
    destination: { type: String, required: true },
    category: { type: String, required: true },
    newTab: { type: Boolean, required: true },
    rank: { type: Number },
});

LinkSchema.index({ text: 1, destination: 1 }, { unique: true });

export default LinkSchema;
