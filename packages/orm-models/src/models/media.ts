import { Constants, Media } from "@courselit/common-models";
import mongoose from "mongoose";

type MediaWithOwner = Media & { userId: string };

export const MediaSchema = new mongoose.Schema<MediaWithOwner>({
    mediaId: { type: String, required: true },
    originalFileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    access: {
        type: String,
        required: true,
        enum: Object.values(Constants.MediaAccessType),
    },
    thumbnail: String,
    caption: String,
    file: String,
});
