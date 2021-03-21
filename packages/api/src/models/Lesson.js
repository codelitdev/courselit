const mongoose = require("mongoose");
const { text, video, audio, pdf, quiz } = require("../config/constants.js");

const LessonSchema = new mongoose.Schema({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  type: { type: String, required: true, enum: [text, video, audio, pdf, quiz] },
  content: String,
  contentURL: String,
  downloadable: { type: Boolean, default: false },
  creatorId: mongoose.Schema.Types.ObjectId,
  courseId: mongoose.Schema.Types.ObjectId,
  requiresEnrollment: { type: Boolean, default: false },
});

module.exports = mongoose.model("Lesson", LessonSchema);
