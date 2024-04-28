import { Media, SiteInfo } from "@courselit/common-models";
import mongoose from "mongoose";

const MediaSchema = new mongoose.Schema<Media>({
    mediaId: { type: String, required: true },
    originalFileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    access: { type: String, required: true },
    thumbnail: String,
    caption: String,
    file: String,
});

const SettingsSchema = new mongoose.Schema<SiteInfo>({
    title: { type: String },
    subtitle: { type: String },
    logo: MediaSchema,
    mailingAddress: { type: String },
});

export default SettingsSchema;
