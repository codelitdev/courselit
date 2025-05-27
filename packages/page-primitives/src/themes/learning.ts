import { Theme, ThemeStyle } from "@courselit/page-models";

const themeStyles: ThemeStyle = {
    colors: {
        light: {
            background: "#f5f5ff",
            foreground: "#2a2a4a",
            card: "#ffffff",
            cardForeground: "#2a2a4a",
            primary: "#6e56cf",
            primaryForeground: "#ffffff",
            secondary: "#e4dfff",
            secondaryForeground: "#4a4080",
            muted: "#f0f0fa",
            mutedForeground: "#6c6c8a",
            accent: "#d8e6ff",
            accentForeground: "#2a2a4a",
            border: "#e0e0f0",
            destructive: "#ff5470",
            input: "#e0e0f0",
        },
        dark: {
            background: "#0f0f1a",
            foreground: "#e2e2f5",
            card: "#1a1a2e",
            cardForeground: "#e2e2f5",
            primary: "#a48fff",
            primaryForeground: "#0f0f1a",
            secondary: "#2d2b55",
            secondaryForeground: "#c4c2ff",
            muted: "#222244",
            mutedForeground: "#a0a0c0",
            accent: "#303060",
            accentForeground: "#e2e2f5",
            border: "#303052",
            destructive: "#ff5470",
            input: "#303052",
        },
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
                // width: "border-2",
                radius: "rounded",
                // style: "border-solid",
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
            border: {
                // width: "border-2",
                // style: "border-solid"
            },
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
