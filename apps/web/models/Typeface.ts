import { Schema } from "mongoose";

type fontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000;

export interface Typeface {
    section:
        | "default"
        | "title"
        | "subtitle"
        | "body"
        | "navigation"
        | "button";
    typeface: string;
    fontWeights: fontWeight[];
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    case: "uppercase" | "lowercase" | "captilize";
}

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
