const mongoose = require("mongoose");

const CustomisationSchema = new mongoose.Schema({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    codeInjectionHead: { type: String },
});

module.exports = mongoose.model("Customisation", CustomisationSchema);
