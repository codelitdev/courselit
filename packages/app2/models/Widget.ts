/**
 * A model for a widget.
 *
 */
import mongoose from "mongoose";

interface Widget {
  domain: mongoose.Types.ObjectId;
  name: string;
  settings: Record<string, unknown>;
  data: Record<string, unknown>;
}

const WidgetSchema = new mongoose.Schema<Widget>({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  settings: mongoose.Schema.Types.Mixed,
  data: mongoose.Schema.Types.Mixed,
});

WidgetSchema.index(
  {
    domain: 1,
    name: 1,
  },
  { unique: true }
);

export default mongoose.models.Widget || mongoose.model("Widget", WidgetSchema);
