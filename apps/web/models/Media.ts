import { Media } from "@courselit/common-models";
import mongoose from "mongoose";
import constants from "../config/constants";
const { publicMedia, privateMedia } = constants;

const MediaSchema = new mongoose.Schema<Media>({
    mediaId: { type: String, required: true },
    originalFileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    access: { type: String, required: true, enum: [publicMedia, privateMedia] },
    thumbnail: String,
    caption: String,
    file: String,
});

export default MediaSchema;
