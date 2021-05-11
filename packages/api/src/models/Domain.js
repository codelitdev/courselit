const mongoose = require("mongoose");

const DomainSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    customDomain: { type: String, unique: true, sparse: true },
    email: { type: String, required: true },
    deleted: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Domain", DomainSchema);
