import { Theme, ThemeStyle } from "@courselit/page-models";

const themeStyles: ThemeStyle = {
    colors: {
        primary: "#2563EB", // blue-600
        secondary: "#6366F1", // indigo-500 (slightly lighter for modern look)
        background: "#F8FAFC", // slate-50 (softer, more modern)
        border: "#E2E8F0", // slate-200 (softer border)
        text: "#0F172A", // slate-900 (higher contrast)
        buttonText: "#FFFFFF", // high-contrast button text
        success: "#22C55E", // green-500
        error: "#EF4444", // red-500
        warning: "#F59E42", // amber-400
        info: "#3B82F6", // blue-500
    },
    typography: {
        preheader: {
            fontFamily: "font-inter",
            fontSize: "text-xs",
            fontWeight: "font-semibold",
            lineHeight: "leading-normal",
            letterSpacing: "tracking-wide",
        },
        header1: {
            fontFamily: "font-inter",
            fontSize: "text-5xl",
            fontWeight: "font-extrabold",
            lineHeight: "leading-tight",
        },
        header2: {
            fontFamily: "font-inter",
            fontSize: "text-4xl",
            fontWeight: "font-bold",
            lineHeight: "leading-tight",
        },
        header3: {
            fontFamily: "font-inter",
            fontSize: "text-3xl",
            fontWeight: "font-semibold",
            lineHeight: "leading-snug",
        },
        header4: {
            fontFamily: "font-inter",
            fontSize: "text-2xl",
            fontWeight: "font-medium",
            lineHeight: "leading-snug",
        },
        subheader1: {
            fontFamily: "font-open-sans",
            fontSize: "text-lg",
            fontWeight: "font-medium",
            lineHeight: "leading-relaxed",
        },
        subheader2: {
            fontFamily: "font-open-sans",
            fontSize: "text-base",
            fontWeight: "font-normal",
            lineHeight: "leading-relaxed",
        },
        text1: {
            fontFamily: "font-open-sans",
            fontSize: "text-base",
            fontWeight: "font-normal",
            lineHeight: "leading-relaxed",
        },
        text2: {
            fontFamily: "font-open-sans",
            fontSize: "text-sm",
            fontWeight: "font-light",
            lineHeight: "leading-relaxed",
        },
        link: {
            fontFamily: "font-open-sans",
            fontSize: "text-base",
            fontWeight: "font-semibold",
            textDecoration: "underline",
        },
        button: {
            fontFamily: "font-inter",
            fontSize: "text-base",
            fontWeight: "font-semibold",
            textTransform: "uppercase",
        },
        input: {
            fontFamily: "font-open-sans",
            fontSize: "text-base",
            fontWeight: "font-normal",
        },
        caption: {
            fontFamily: "font-open-sans",
            fontSize: "text-xs",
            fontWeight: "font-normal",
            lineHeight: "leading-normal",
        },
    },
    interactives: {
        button: {
            padding: { x: "px-6", y: "py-4" },
            border: {
                width: "border-2",
                radius: "rounded",
                style: "border-solid",
            },
            shadow: "shadow-lg",
            hover: "transition-all duration-200 ease-in-out hover:bg-blue-700 hover:shadow-xl hover:scale-105",
            disabled: {
                background: "#F3F4F6",
                opacity: "opacity-50",
                cursor: "cursor-not-allowed",
            },
        },
        link: {
            padding: { x: "px-1", y: "py-0" },
            hover: "transition-all duration-150 ease-in-out hover:text-blue-700 hover:underline hover:scale-105",
        },
        card: {
            padding: { x: "px-8", y: "py-8" },
            border: {
                width: "border",
                radius: "rounded",
                style: "border-solid",
            },
            shadow: "shadow-xl",
            hover: "transition-all duration-200 ease-in-out hover:shadow-2xl hover:scale-105",
        },
        input: {
            borderRadius: "rounded-lg",
            padding: { x: "px-5", y: "py-3" },
            border: { width: "border-2", style: "border-solid" },
            shadow: "shadow",
            hover: "transition-all duration-150 ease-in-out hover:border-blue-400 hover:shadow-md",
            disabled: {
                background: "#F3F4F6",
                cursor: "cursor-not-allowed",
                opacity: "opacity-50",
            },
        },
    },
    structure: {
        page: { width: "max-w-6xl" },
        section: {
            padding: { x: "px-8", y: "py-10" },
        },
    },
};

export const learning: Theme = {
    id: "learning",
    name: "Learning",
    theme: themeStyles,
};
