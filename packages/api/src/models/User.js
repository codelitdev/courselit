const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const constants = require("../config/constants.js");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const UserSchema = new mongoose.Schema({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  email: { type: String, required: true },
  active: { type: Boolean, required: true, default: true },
  name: { type: String, required: false },
  purchases: [mongoose.Schema.Types.ObjectId],
  bio: { type: String },
  permissions: [String],
});

UserSchema.index({
  email: "text",
  name: "text",
});

UserSchema.index(
  {
    domain: 1,
    email: 1,
  },
  { unique: true }
);

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
