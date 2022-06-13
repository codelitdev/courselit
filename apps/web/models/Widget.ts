/**
 * A model for a widget.
 *
 */
import mongoose from "mongoose";

interface Widget {
    name: string;
    settings: Record<string, unknown>;
    data: Record<string, unknown>;
}

const WidgetSchema = new mongoose.Schema<Widget>({
    name: { type: String, required: true },
    settings: mongoose.Schema.Types.Mixed,
    data: mongoose.Schema.Types.Mixed,
});

export default WidgetSchema;
