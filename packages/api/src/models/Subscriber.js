const mongoose = require("mongoose");

const SubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    stripeCustomerId: { type: String, unique: true, sparse: true },
    stripeSubscriptionId: { type: String, unique: true, sparse: true },
    subscriptionEndsAfter: { type: Date, required: true },
    emailVerified: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subscriber", SubscriberSchema);
