const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const constants = require('../config/constants.js')

const UserSchema = mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  verified: { type: Boolean, default: false },
  name: String,
  isCreator: { type: Boolean, default: false },
  purchases: [mongoose.Schema.Types.ObjectId]
})

// This pre-hook which runs before saving the data to db, for
// hashing the plain text password.
UserSchema.pre('save', async function (next) {
  const user = this
  const hash = await bcrypt.hash(user.password, constants.saltRounds)
  user.password = hash
  next()
})

UserSchema.methods.isPasswordValid = async function (password) {
  const user = this
  const compare = await bcrypt.compare(password, user.password)
  return compare
}

module.exports = mongoose.model('User', UserSchema)
