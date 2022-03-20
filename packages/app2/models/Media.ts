import mongoose from "mongoose";

const AutoIncrement = require("mongoose-sequence")(mongoose);

export interface Media {
  id: mongoose.Types.ObjectId;
  mediaId: number;
  domain: mongoose.Types.ObjectId;
  originalFileName: string;
  file: string;
  mimeType: string;
  creatorId: mongoose.Types.ObjectId;
  public: boolean;
  size: number;
  caption?: string;
  thumbnail?: string;
}

const MediaSchema = new mongoose.Schema<Media>(
  {
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    originalFileName: { type: String, required: true },
    file: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    public: { type: Boolean, required: true, default: false },
    caption: { type: String },
    thumbnail: { type: String },
  },
  {
    timestamps: true,
  }
);

MediaSchema.index({
  originalFileName: "text",
  caption: "text",
});

if (!mongoose.models.Media) {
  MediaSchema.plugin(AutoIncrement, { inc_field: "mediaId" });
}

export default mongoose.models.Media || mongoose.model("Media", MediaSchema);
