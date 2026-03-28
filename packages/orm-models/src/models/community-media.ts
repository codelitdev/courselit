import mongoose from "mongoose";
import { MediaSchema } from "./media";
import { CommunityMedia } from "@courselit/common-models";

export const CommunityMediaSchema = new mongoose.Schema<CommunityMedia>({
    type: { type: String, required: true },
    title: { type: String, required: true },
    url: { type: String },
    media: MediaSchema,
});
