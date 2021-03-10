const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { unlisted, open, closed } = require("../config/constants.js");

const CourseSchema = new mongoose.Schema({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  cost: { type: Number, required: true },
  privacy: { type: String, required: true, enum: [unlisted, open, closed] },
  creatorId: { type: String, required: true },
  creatorName: { type: String, required: true },
  updated: { type: Date, required: true, default: Date.now },
  published: { type: Boolean, required: true, default: false },
  isBlog: { type: Boolean, required: true, default: false },
  isFeatured: { type: Boolean, required: true, default: false },
  lessons: [String],
  description: String,
  featuredImage: String,
});

CourseSchema.plugin(AutoIncrement, { inc_field: "courseId" });

module.exports = mongoose.model("Course", CourseSchema);
