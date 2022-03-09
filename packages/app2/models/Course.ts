import mongoose from 'mongoose';
import AutoIncrementFactory from 'mongoose-sequence';
const AutoIncrement = AutoIncrementFactory(mongoose);
import Constants from '../config/constants';

const CourseSchema = new mongoose.Schema({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  cost: { type: Number, required: true },
  privacy: { type: String, required: true, enum: [Constants.unlisted, Constants.open] },
  creatorId: { type: String, required: true },
  creatorName: { type: String },
  updated: { type: Date, required: true, default: Date.now },
  published: { type: Boolean, required: true, default: false },
  isBlog: { type: Boolean, required: true, default: false },
  isFeatured: { type: Boolean, required: true, default: false },
  lessons: [String],
  description: String,
  featuredImage: mongoose.Schema.Types.ObjectId,
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

if (!mongoose.models.Course) {
  CourseSchema.plugin(AutoIncrement, { inc_field: "courseId" });
}

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
