import { Typeface } from "@courselit/common-models";
import { Schema } from "mongoose";

const TypefaceSchema = new Schema<Typeface>({
    section: {
        type: String,
        required: true,
        enum: ["default", "title", "subtitle", "body", "navigation", "button"],
    },
    typeface: String,
    fontWeights: [
        {
            type: Number,
            required: true,
            enum: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
        },
    ],
    fontSize: Number,
    lineHeight: Number,
    letterSpacing: Number,
    case: {
        type: String,
        required: true,
        enum: ["uppercase", "lowercase", "captilize"],
        default: "captilize",
    },
});

export default TypefaceSchema;
