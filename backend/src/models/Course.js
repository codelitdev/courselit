const mongoose = require('mongoose')
const {
  unlisted,
  open,
  closed
} = require('../config/constants.js')

const CourseSchema = mongoose.Schema({
  title: { type: String, required: true },
  cost: { type: Number, required: true },
  published: { type: Boolean, default: false },
  privacy: { type: String, required: true, enum: [unlisted, open, closed] },
  description: String,
  featuredImage: String,
  isBlog: { type: Boolean, default: false },
  creatorId: mongoose.Schema.Types.ObjectId,
  lessons: [String]
})

module.exports = mongoose.model('Course', CourseSchema)
