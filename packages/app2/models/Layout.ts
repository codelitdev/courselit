/**
 * A model for the front-end layout.
 */
import mongoose from "mongoose";

export interface Layout {
  domain: string;
  layout: any;
}

const LayoutSchema = new mongoose.Schema({
  domain: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  layout: { type: mongoose.Schema.Types.Mixed, required: true },
});

export default mongoose.models.Layout || mongoose.model("Layout", LayoutSchema);
