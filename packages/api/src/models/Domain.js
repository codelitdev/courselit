const mongoose = require("mongoose");

const DomainSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  subscription: { type: Boolean, required: true, default: true },
});

module.exports = mongoose.model("Domain", DomainSchema);
