const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { unlisted, open } = require("../config/constants.js");

const CourseSchema = new mongoose.Schema({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  cost: { type: Number, required: true },
  privacy: { type: String, required: true, enum: [unlisted, open] },
  creatorId: { type: String, required: true },
  creatorName: { type: String },
  updated: { type: Date, required: true, default: Date.now },
  published: { type: Boolean, required: true, default: false },
  isBlog: { type: Boolean, required: true, default: false },
  isFeatured: { type: Boolean, required: true, default: false },
  lessons: [String],
  description: String,
  featuredImage: String,
  groups: [
    {
      name: { type: String, required: true },
      // order of the group on the UI
      rank: { type: Number, required: true },
      // to not show associated lessons as top members on the UI
      collapsed: { type: Boolean, required: true, default: true },
    },
  ],
});

CourseSchema.index({
  title: "text",
});

CourseSchema.pre("save", function (next) {
  this.updated = Date.now();
  return next();
});

CourseSchema.plugin(AutoIncrement, { inc_field: "courseId" });

module.exports = mongoose.model("Course", CourseSchema);
