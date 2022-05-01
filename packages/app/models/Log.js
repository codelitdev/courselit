const mongoose = require("mongoose");
const {
  severityError,
  severityInfo,
  severityWarn,
} = require("../config/constants.js");

const LogSchema = new mongoose.Schema(
  {
    severity: {
      type: String,
      required: true,
      enum: [severityError, severityInfo, severityWarn],
    },
    message: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Log", LogSchema);
