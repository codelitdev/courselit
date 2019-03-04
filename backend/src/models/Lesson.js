const mongoose = require('mongoose')

const LessonSchema = mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  content: String,
  contentURL: String,
  downloadable: { type: Boolean, default: false },
  courseId: mongoose.Schema.Types.ObjectId,
  creatorId: mongoose.Schema.Types.ObjectId
})

module.exports = mongoose.model('Lesson', LessonSchema)
