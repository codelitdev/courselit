const mongoose = require('mongoose')

const PurchaseSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
  purchasedOn: { type: Date, required: true, default: Date.now },
  purchasedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  paymentMethod: { type: String, required: true },
  paymentId: { type: String, required: true },
  amount: { type: Number, required: true },
  discount: { type: Number }
})

module.exports = mongoose.model('Purchase', PurchaseSchema)
