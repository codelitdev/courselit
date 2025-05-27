import { ThemeStyle } from "@courselit/page-models";
import mongoose from "mongoose";

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

const ColorsSchema = new mongoose.Schema(
    {
        background: { type: String, required: true },
        foreground: { type: String, required: true },
        card: { type: String, required: true },
        cardForeground: { type: String, required: true },
        primary: { type: String, required: true },
        primaryForeground: { type: String, required: true },
        secondary: { type: String, required: true },
        secondaryForeground: { type: String, required: true },
        muted: { type: String, required: true },
        mutedForeground: { type: String, required: true },
        accent: { type: String, required: true },
        accentForeground: { type: String, required: true },
        border: { type: String, required: true },
        destructive: { type: String, required: true },
        input: { type: String, required: true },
    },
    { _id: false },
);

export const ThemeSchema = new mongoose.Schema<ThemeStyle>({
    colors: {
        type: {
            light: { type: ColorsSchema, required: true },
            dark: { type: ColorsSchema, required: true },
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
