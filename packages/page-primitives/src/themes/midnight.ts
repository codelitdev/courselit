import { Theme, ThemeStyle } from "@courselit/page-models";

const themeStyles: ThemeStyle = {
    colors: {
        primary: "#61AFEF", // bright blue
        secondary: "#6366F1", // indigo-500 (modern secondary)
        background: "#282C34", // editor background
        border: "#3E4451", // panel border
        text: "#ABB2BF", // light gray text
        buttonText: "#FFFFFF", // high-contrast button text
        success: "#98C379", // green
        error: "#E06C75", // red
        warning: "#E5C07B", // yellow
        info: "#56B6C2", // cyan
    },
    typography: {
        preheader: {
            fontFamily: "font-roboto",
            fontSize: "text-xs",
            fontWeight: "font-normal",
            lineHeight: "leading-normal",
        },
        header1: {
            fontFamily: "font-roboto",
            fontSize: "text-5xl",
            fontWeight: "font-bold",
            lineHeight: "leading-tight",
        },
        header2: {
            fontFamily: "font-roboto",
            fontSize: "text-4xl",
            fontWeight: "font-semibold",
            lineHeight: "leading-tight",
        },
        header3: {
            fontFamily: "font-roboto",
            fontSize: "text-3xl",
            fontWeight: "font-medium",
            lineHeight: "leading-snug",
        },
        header4: {
            fontFamily: "font-roboto",
            fontSize: "text-2xl",
            fontWeight: "font-medium",
            lineHeight: "leading-snug",
        },
        subheader1: {
            fontFamily: "font-roboto",
            fontSize: "text-lg",
            fontWeight: "font-medium",
            lineHeight: "leading-relaxed",
        },
        subheader2: {
            fontFamily: "font-roboto",
            fontSize: "text-base",
            fontWeight: "font-normal",
            lineHeight: "leading-relaxed",
        },
        text1: {
            fontFamily: "font-roboto",
            fontSize: "text-base",
            fontWeight: "font-normal",
            lineHeight: "leading-relaxed",
        },
        text2: {
            fontFamily: "font-roboto",
            fontSize: "text-sm",
            fontWeight: "font-light",
            lineHeight: "leading-relaxed",
        },
        link: {
            fontFamily: "font-roboto",
            fontSize: "text-base",
            fontWeight: "font-medium",
            // textDecoration: "underline",
        },
        button: {
            fontFamily: "font-roboto",
            fontSize: "text-sm",
            fontWeight: "font-bold",
            textTransform: "uppercase",
        },
        input: {
            fontFamily: "font-roboto",
            fontSize: "text-base",
            fontWeight: "font-normal",
        },
        caption: {
            fontFamily: "font-roboto",
            fontSize: "text-xs",
            fontWeight: "font-normal",
            lineHeight: "leading-normal",
        },
    },
    interactives: {
        button: {
            padding: { x: "px-4", y: "py-2" },
            border: {
                width: "border",
                radius: "rounded-none",
                style: "border-solid",
            },
            shadow: "shadow-none",
            hover: "transition-all duration-200 ease-in-out hover:bg-blue-400 hover:text-black hover:shadow-md hover:scale-105",
            disabled: {
                background: "bg-slate-700",
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
                width: "border",
                radius: "rounded-none",
                style: "border-solid",
            },
            shadow: "shadow-inner",
            hover: "transition-shadow duration-200 ease-in hover:shadow-md",
        },
        input: {
            padding: { x: "px-4", y: "py-2" },
            border: {
                width: "border",
                radius: "rounded-none",
                style: "border-solid",
            },
            shadow: "shadow-inner",
            hover: "transition-colors duration-150 ease-in-out hover:border-blue-400",
            disabled: {
                background: "bg-slate-700",
                opacity: "opacity-50",
                cursor: "cursor-not-allowed",
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

export const midnight: Theme = {
    id: "midnight",
    name: "Midnight",
    theme: themeStyles,
};
