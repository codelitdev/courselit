import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";
import { ThemeSchema } from "./Theme";
import { UserTheme } from "@courselit/common-models";

export interface InternalUserTheme extends UserTheme {
    domain: mongoose.Types.ObjectId;
}

const UserThemeSchema = new mongoose.Schema<InternalUserTheme>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    themeId: {
        type: String,
        required: true,
        unique: true,
        default: generateUniqueId,
    },
    name: { type: String, required: true },
    parentThemeId: { type: String, required: true },
    userId: { type: String, required: true },
    theme: { type: ThemeSchema, required: true },
    draftTheme: { type: ThemeSchema, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

UserThemeSchema.index({ domain: 1, themeName: 1 }, { unique: true });

export default mongoose.models.UserTheme ||
    mongoose.model("UserTheme", UserThemeSchema);
