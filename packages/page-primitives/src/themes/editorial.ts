import { Theme, ThemeStyle } from "@courselit/page-models";

const themeStyles: ThemeStyle = {
    colors: {
        primary: "#1E3A8A", // dark indigo
        secondary: "#D97706", // amber-600
        background: "#FFFFFF", // white
        border: "#E5E7EB", // gray-200
        text: "#111827", // gray-900
        buttonText: "#FFFFFF", // high-contrast button text
        success: "#10B981", // green-500
        error: "#EF4444", // red-500
        warning: "#F59E0B", // amber-500
        info: "#3B82F6", // blue-500
    },
    typography: {
        preheader: {
            fontFamily: "font-open-sans",
            fontSize: "text-sm",
            fontWeight: "font-semibold",
            lineHeight: "leading-normal",
            letterSpacing: "tracking-wide",
        },
        header1: {
            fontFamily: "font-playfair-display",
            fontSize: "text-6xl",
            fontWeight: "font-extrabold",
            lineHeight: "leading-tight",
        },
        header2: {
            fontFamily: "font-playfair-display",
            fontSize: "text-5xl",
            fontWeight: "font-bold",
            lineHeight: "leading-tight",
        },
        header3: {
            fontFamily: "font-playfair-display",
            fontSize: "text-4xl",
            fontWeight: "font-semibold",
            lineHeight: "leading-snug",
        },
        header4: {
            fontFamily: "font-merriweather",
            fontSize: "text-3xl",
            fontWeight: "font-medium",
            lineHeight: "leading-snug",
        },
        subheader1: {
            fontFamily: "font-merriweather",
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
            fontWeight: "font-medium",
            textDecoration: "underline",
        },
        button: {
            fontFamily: "font-playfair-display",
            fontSize: "text-sm",
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
            padding: { x: "px-6", y: "py-3" },
            border: {
                width: "border",
                radius: "rounded-md",
                style: "border-solid",
            },
            shadow: "shadow-sm",
            hover: "transition-colors duration-200 ease-in-out hover:bg-[#1E3A8A] hover:text-white",
            disabled: {
                background: "#F3F4F6",
                opacity: "opacity-50",
                cursor: "cursor-not-allowed",
            },
        },
        link: {
            padding: { x: "px-1", y: "py-0" },
            hover: "transition-colors duration-150 ease-in-out hover:text-[#1E3A8A]",
        },
        card: {
            padding: { x: "px-6", y: "py-6" },
            border: {
                width: "border",
                radius: "rounded-lg",
                style: "border-solid",
            },
            shadow: "shadow",
            hover: "transition-shadow duration-200 ease-in hover:shadow-lg",
        },
        input: {
            padding: { x: "px-4", y: "py-2" },
            border: {
                width: "border",
                radius: "rounded-md",
                style: "border-solid",
            },
            shadow: "shadow-sm",
            hover: "transition-colors duration-150 ease-in-out hover:border-[#1E3A8A]",
            disabled: {
                background: "#F3F4F6",
                opacity: "opacity-50",
                cursor: "cursor-not-allowed",
            },
        },
    },
    structure: {
        page: { width: "max-w-6xl" },
        section: {
            padding: { x: "px-4", y: "py-4" },
            verticalPadding: "py-10",
        },
    },
};

export const editorial: Theme = {
    id: "editorial",
    name: "Editorial",
    theme: themeStyles,
};
