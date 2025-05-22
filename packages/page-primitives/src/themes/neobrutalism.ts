import { Theme, ThemeStyle } from "@courselit/page-models";

const themeStyles: ThemeStyle = {
    colors: {
        primary: "#95d818", // solid black
        secondary: "#FFFFFF", // crisp white
        background: "#FFFFFF", // white with bold black lines
        border: "#000000", // black outlines everywhere
        text: "#000000", // black text
        buttonText: "#000000", // high-contrast button text
        success: "#00FF00", // neon green
        error: "#FF0000", // bright red
        warning: "#FFFF00", // bright yellow
        info: "#00FFFF", // cyan neon
    },
    typography: {
        preheader: {
            fontFamily: "font-rubik",
            fontSize: "text-sm",
            fontWeight: "font-bold",
            letterSpacing: "tracking-wide",
        },
        header1: {
            fontFamily: "font-bebas-neue",
            fontSize: "text-6xl",
            fontWeight: "font-bold",
            textTransform: "uppercase",
        },
        header2: {
            fontFamily: "font-bebas-neue",
            fontSize: "text-5xl",
            fontWeight: "font-bold",
            textTransform: "uppercase",
        },
        header3: {
            fontFamily: "font-oswald",
            fontSize: "text-4xl",
            fontWeight: "font-semibold",
            textTransform: "uppercase",
        },
        header4: {
            fontFamily: "font-oswald",
            fontSize: "text-3xl",
            fontWeight: "font-medium",
        },
        subheader1: {
            fontFamily: "font-inter",
            fontSize: "text-xl",
            fontWeight: "font-medium",
        },
        subheader2: {
            fontFamily: "font-inter",
            fontSize: "text-base",
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
            fontWeight: "font-light",
        },
        link: {
            fontFamily: "font-inter",
            fontSize: "text-base",
            fontWeight: "font-semibold",
            textDecoration: "underline",
        },
        button: {
            fontFamily: "font-rubik",
            fontSize: "text-base",
            fontWeight: "font-bold",
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
            shadow: "shadow-neo",
            hover: "transition-all duration-200 ease-in-out hover:shadow-none hover:translate-x-1 hover:translate-y-1",
            disabled: {
                background: "#F3F4F6",
                opacity: "opacity-50",
                cursor: "cursor-not-allowed",
            },
        },
        link: {
            padding: { x: "px-1", y: "py-0" },
            hover: "underline",
        },
        card: {
            padding: { x: "px-6", y: "py-6" },
            border: {
                width: "border-2",
                radius: "rounded-none",
                style: "border-solid",
            },
            shadow: "shadow-neo",
            hover: "transition-all duration-200 ease-in-out hover:shadow-neo-lg hover:translate-y-1",
        },
        input: {
            borderRadius: "rounded-none",
            padding: { x: "px-4", y: "py-2" },
            border: { width: "border-2", style: "border-solid" },
            shadow: "shadow-neo",
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
