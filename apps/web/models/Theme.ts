import mongoose from "mongoose";
import { Theme } from "@courselit/common-models";

const TypographySchema = new mongoose.Schema(
    {
        fontFamily: { type: String, required: true },
        fontSize: { type: String, required: true },
        fontWeight: { type: String, required: true },
        lineHeight: { type: String },
        letterSpacing: { type: String },
        textTransform: { type: String },
        textDecoration: { type: String },
        textOverflow: { type: String },
    },
    { _id: false },
);

export const ThemeSchema = new mongoose.Schema<Theme>({
    colors: {
        type: {
            primary: { type: String, required: true },
            secondary: { type: String, required: true },
            background: { type: String, required: true },
            border: { type: String, required: true },
            text: { type: String, required: true },
            success: { type: String, required: true },
            error: { type: String, required: true },
            warning: { type: String, required: true },
            info: { type: String, required: true },
        },
        _id: false,
    },
    typography: {
        type: {
            preheader: { type: TypographySchema, required: true },
            header1: { type: TypographySchema, required: true },
            header2: { type: TypographySchema, required: true },
            header3: { type: TypographySchema, required: true },
            header4: { type: TypographySchema, required: true },
            subheader1: { type: TypographySchema, required: true },
            subheader2: { type: TypographySchema, required: true },
            text1: { type: TypographySchema, required: true },
            text2: { type: TypographySchema, required: true },
            link: { type: TypographySchema, required: true },
            button: { type: TypographySchema, required: true },
            input: { type: TypographySchema, required: true },
            caption: { type: TypographySchema, required: true },
        },
        _id: false,
    },
    interactives: {
        type: {
            button: { type: mongoose.Schema.Types.Mixed, required: true },
            link: { type: mongoose.Schema.Types.Mixed, required: true },
            card: { type: mongoose.Schema.Types.Mixed, required: true },
            input: { type: mongoose.Schema.Types.Mixed, required: true },
        },
        _id: false,
    },
    structure: {
        type: {
            page: {
                type: {
                    width: { type: String, required: true },
                },
                required: true,
                _id: false,
            },
            section: {
                type: {
                    padding: {
                        type: mongoose.Schema.Types.Mixed,
                        required: true,
                    },
                    verticalPadding: { type: String, required: true },
                },
                required: true,
                _id: false,
            },
        },
        required: true,
        _id: false,
    },
});

export default mongoose.models.Theme || mongoose.model("Theme", ThemeSchema);
