import mongoose from "mongoose";
import MediaSchema from "./Media";
import { CommunityMedia } from "@courselit/common-models";

const CommunityMediaSchema = new mongoose.Schema<CommunityMedia>({
    type: { type: String, required: true },
    title: { type: String, required: true },
    url: { type: String },
    media: MediaSchema,
});

export default CommunityMediaSchema;
