import { Theme, ThemeStyle } from "@courselit/page-models";

const themeStyles: ThemeStyle = {
    colors: {
        primary: "#FFF700", // vibrant yellow from the button
        secondary: "#7DF9FF", // vibrant cyan
        background: "#6FFFD7", // mint green from the card background
        border: "#000000", // black outlines everywhere
        text: "#000000", // black text
        buttonText: "#000000", // high-contrast button text
        success: "#2FF2F2", // neon green-cyan
        error: "#FF4911", // bright orange-red
        warning: "#FFFF00", // bright yellow
        info: "#3300FF", // vibrant blue
    },
    typography: {
        preheader: {
            fontFamily: "font-inter",
            fontSize: "text-sm",
            fontWeight: "font-normal",
        },
        header1: {
            fontFamily: "font-inter",
            fontSize: "text-3xl",
            fontWeight: "font-bold",
            textTransform: "normal-case",
        },
        header2: {
            fontFamily: "font-inter",
            fontSize: "text-2xl",
            fontWeight: "font-bold",
            textTransform: "normal-case",
        },
        header3: {
            fontFamily: "font-inter",
            fontSize: "text-xl",
            fontWeight: "font-bold",
            textTransform: "normal-case",
        },
        header4: {
            fontFamily: "font-inter",
            fontSize: "text-lg",
            fontWeight: "font-bold",
            textTransform: "normal-case",
        },
        subheader1: {
            fontFamily: "font-inter",
            fontSize: "text-base",
            fontWeight: "font-normal",
        },
        subheader2: {
            fontFamily: "font-inter",
            fontSize: "text-sm",
            fontWeight: "font-normal",
        },
        text1: {
            fontFamily: "font-inter",
            fontSize: "text-base",
            fontWeight: "font-normal",
        },
        text2: {
            fontFamily: "font-inter",
            fontSize: "text-sm",
            fontWeight: "font-normal",
        },
        link: {
            fontFamily: "font-inter",
            fontSize: "text-base",
            fontWeight: "font-semibold",
        },
        button: {
            fontFamily: "font-inter",
            fontSize: "text-base",
            fontWeight: "font-bold",
            textTransform: "normal-case",
        },
        input: {
            fontFamily: "font-inter",
            fontSize: "text-base",
            fontWeight: "font-normal",
        },
        caption: {
            fontFamily: "font-inter",
            fontSize: "text-xs",
            fontWeight: "font-normal",
        },
    },
    interactives: {
        button: {
            padding: { x: "px-4", y: "py-2" },
            border: {
                width: "border-2",
                radius: "rounded-none",
                style: "border-solid",
            },
            customShadow: "4px 4px 0 0 #000000",
            shadow: "shadow-custom",
            hover: "transition-all duration-200 ease-in-out hover:shadow-none hover:translate-x-1 hover:translate-y-1",
            disabled: {
                background: "#F3F4F6",
                opacity: "opacity-50",
                cursor: "cursor-not-allowed",
            },
        },
        link: {
            padding: { x: "px-1", y: "py-0" },
            hover: "hover:underline",
        },
        card: {
            padding: { x: "px-6", y: "py-6" },
            border: {
                width: "border-2",
                radius: "rounded-none",
                style: "border-solid",
            },
            customShadow: "4px 4px 0 0 #000000",
            shadow: "shadow-custom",
            hover: "transition-all duration-200 ease-in-out hover:translate-y-1",
        },
        input: {
            borderRadius: "rounded-none",
            padding: { x: "px-4", y: "py-2" },
            border: { width: "border-2", style: "border-solid" },
            customShadow: "4px 4px 0 0 #000000",
            shadow: "shadow-custom",
            hover: "transition-all duration-150 ease-in-out hover:shadow-none hover:translate-x-1 hover:translate-y-1",
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
            padding: { x: "px-4", y: "py-10" },
        },
    },
};

export const neobrutalism: Theme = {
    id: "neobrutalism",
    name: "Neo-Brutalism",
    theme: themeStyles,
};
