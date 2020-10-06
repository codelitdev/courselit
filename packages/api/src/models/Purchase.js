const mongoose = require("mongoose");
const { transactionInitiated } = require("../config/constants.js");

const PurchaseSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
  purchasedOn: { type: Date, required: true, default: Date.now },
  purchasedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  paymentMethod: { type: String, required: true },
  paymentId: { type: String },
  amount: { type: Number, required: true },
  currencyISOCode: { type: String, required: true },
  discount: { type: Number },
  status: { type: String, required: true, default: transactionInitiated },
  remark: { type: String },
});

module.exports = mongoose.model("Purchase", PurchaseSchema);
