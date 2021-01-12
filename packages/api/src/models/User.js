const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const constants = require("../config/constants.js");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  verified: { type: Boolean, required: true, default: false },
  isCreator: { type: Boolean, required: true, default: false },
  isAdmin: { type: Boolean, required: true, default: false },
  active: { type: Boolean, required: true, default: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  purchases: [mongoose.Schema.Types.ObjectId],
  bio: { type: String },
});

UserSchema.index({
  email: "text",
  name: "text",
});

// This pre-hook hashes the plain text password before saving it to the db
UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const user = this;
    const hash = await bcrypt.hash(user.password, constants.saltRounds);
    user.password = hash;
  }
  next();
});

UserSchema.methods.isPasswordValid = async function (password) {
  const user = this;
  const compare = await bcrypt.compare(password, user.password);
  return compare;
};

UserSchema.plugin(AutoIncrement, { inc_field: "userId" });

module.exports = mongoose.model("User", UserSchema);
