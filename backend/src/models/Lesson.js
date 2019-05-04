const mongoose = require('mongoose')
const {
  text,
  video,
  audio,
  pdf,
  quiz
} = require('../config/constants.js')

const LessonSchema = mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true },
  type: { type: String, required: true, enum: [text, video, audio, pdf, quiz] },
  content: String,
  contentURL: String,
  downloadable: { type: Boolean, default: false },
  creatorId: mongoose.Schema.Types.ObjectId,
  // courseId: { type: mongoose.Schema.Types.ObjectId, required: true }
})

module.exports = mongoose.model('Lesson', LessonSchema)
