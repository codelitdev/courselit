import type { Theme } from "@courselit/common-models";

export const defaultTheme: Theme = {
    name: "default",
    colors: {
        primary: "#2563eb",
        secondary: "#f3f4f6",
        background: "#ffffff",
        border: "#e5e7eb",
        text: "#111827",
        success: "#16a34a",
        error: "#dc2626",
        warning: "#d97706",
        info: "#2563eb",
    },
    typography: {
        preheader: {
            fontFamily: "font-sans",
            fontSize: "text-sm",
            fontWeight: "font-medium",
            lineHeight: "leading-normal",
            letterSpacing: "tracking-wide",
            textTransform: "uppercase",
        },
        header1: {
            fontFamily: "font-sans",
            fontSize: "text-4xl",
            fontWeight: "font-bold",
            lineHeight: "leading-tight",
            letterSpacing: "tracking-tight",
        },
        header2: {
            fontFamily: "font-sans",
            fontSize: "text-3xl",
            fontWeight: "font-bold",
            lineHeight: "leading-tight",
            letterSpacing: "tracking-tight",
        },
        header3: {
            fontFamily: "font-sans",
            fontSize: "text-2xl",
            fontWeight: "font-semibold",
            lineHeight: "leading-snug",
            letterSpacing: "tracking-normal",
        },
        header4: {
            fontFamily: "font-sans",
            fontSize: "text-xl",
            fontWeight: "font-semibold",
            lineHeight: "leading-snug",
            letterSpacing: "tracking-normal",
        },
        subheader1: {
            fontFamily: "font-sans",
            fontSize: "text-lg",
            fontWeight: "font-medium",
            lineHeight: "leading-relaxed",
            letterSpacing: "tracking-normal",
        },
        subheader2: {
            fontFamily: "font-sans",
            fontSize: "text-base",
            fontWeight: "font-medium",
            lineHeight: "leading-relaxed",
            letterSpacing: "tracking-normal",
        },
        text1: {
            fontFamily: "font-sans",
            fontSize: "text-base",
            fontWeight: "font-normal",
            lineHeight: "leading-relaxed",
            letterSpacing: "tracking-normal",
        },
        text2: {
            fontFamily: "font-sans",
            fontSize: "text-sm",
            fontWeight: "font-normal",
            lineHeight: "leading-relaxed",
            letterSpacing: "tracking-normal",
        },
        caption: {
            fontFamily: "font-sans",
            fontSize: "text-xs",
            fontWeight: "font-normal",
            lineHeight: "leading-relaxed",
            letterSpacing: "tracking-normal",
        },
        link: {
            fontFamily: "font-sans",
            fontSize: "text-base",
            fontWeight: "font-normal",
            lineHeight: "leading-relaxed",
            letterSpacing: "tracking-normal",
            textDecoration: "no-underline",
        },
        button: {
            fontFamily: "font-sans",
            fontSize: "text-base",
            fontWeight: "font-medium",
            lineHeight: "leading-normal",
            letterSpacing: "tracking-normal",
        },
        input: {
            fontFamily: "font-sans",
            fontSize: "text-sm",
            fontWeight: "font-normal",
            lineHeight: "leading-normal",
            letterSpacing: "tracking-normal",
        },
    },
    interactives: {
        button: {
            padding: {
                x: "px-4",
                y: "py-2",
            },
            border: {
                radius: "rounded-md",
                style: "solid",
            },
            shadow: "shadow-sm",
            hover: {
                background: "blue-700",
                shadow: "shadow-md",
            },
            disabled: {
                opacity: "opacity-50",
                cursor: "cursor-not-allowed",
            },
        },
        link: {
            hover: {
                color: "blue-800",
            },
            disabled: {
                color: "gray-400",
                cursor: "cursor-not-allowed",
            },
        },
        card: {
            padding: {
                x: "px-6",
                y: "py-6",
            },
            border: {
                radius: "rounded-lg",
                style: "solid",
            },
            shadow: "shadow-sm",
            hover: {
                shadow: "shadow-md",
            },
        },
        input: {
            borderRadius: "rounded-md",
            padding: {
                x: "px-3",
                y: "py-2",
            },
            border: {
                style: "solid",
            },
            shadow: "shadow-sm",
            hover: {
                border: {
                    color: "blue-500",
                },
            },
            disabled: {
                opacity: "opacity-50",
                cursor: "cursor-not-allowed",
            },
        },
    },
    structure: {
        page: {
            width: "max-w-7xl",
        },
    },
};
