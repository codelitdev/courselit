const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const MediaSchema = new mongoose.Schema({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  originalFileName: { type: String, required: true },
  file: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  altText: { type: String },
  thumbnail: { type: String },
});

MediaSchema.index({
  originalFileName: "text",
  altText: "text",
});

MediaSchema.plugin(AutoIncrement, { inc_field: "mediaId" });

module.exports = mongoose.model("Media", MediaSchema);
