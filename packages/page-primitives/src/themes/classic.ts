import { Theme, ThemeStyle } from "@courselit/page-models";

const themeStyles: ThemeStyle = {
    colors: {
        light: {
            background: "#ffffff",
            foreground: "#111827",
            card: "#ffffff",
            cardForeground: "#111827",
            primary: "#000000",
            primaryForeground: "#FFFFFF",
            secondary: "#333333",
            secondaryForeground: "#FFFFFF",
            muted: "#9ca3af",
            mutedForeground: "#9ca3af",
            accent: "#16a34a",
            accentForeground: "#16a34a",
            border: "#e5e7eb",
            destructive: "#dc2626",
            input: "#e5e7eb",
        },
        dark: {
            background: "#111827",
            foreground: "#ffffff",
            card: "#111827",
            cardForeground: "#ffffff",
            primary: "#000000",
            primaryForeground: "#FFFFFF",
            secondary: "#333333",
            secondaryForeground: "#FFFFFF",
            muted: "#9ca3af",
            mutedForeground: "#9ca3af",
            accent: "#16a34a",
            accentForeground: "#16a34a",
            border: "#e5e7eb",
            destructive: "#dc2626",
            input: "#e5e7eb",
        },
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
                width: "border",
                radius: "rounded-md",
                style: "border-solid",
            },
            shadow: "shadow-sm",
            disabled: {
                opacity: "opacity-50",
                cursor: "cursor-not-allowed",
            },
            hover: "",
        },
        link: {
            hover: "",
            disabled: {
                color: "gray-400",
                cursor: "cursor-not-allowed",
            },
        },
        card: {
            padding: {
                x: "px-4",
                y: "py-4",
            },
            border: {
                width: "border",
                radius: "rounded-lg",
                style: "border-solid",
            },
            shadow: "shadow-sm",
            hover: "transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        },
        input: {
            borderRadius: "rounded-md",
            padding: {
                x: "px-3",
                y: "py-2",
            },
            border: {
                style: "border-solid",
            },
            shadow: "shadow-sm",
            hover: "",
            disabled: {
                opacity: "opacity-50",
                cursor: "cursor-not-allowed",
            },
        },
    },
    structure: {
        page: {
            width: "max-w-6xl",
        },
        section: {
            padding: {
                x: "px-4",
                y: "py-16",
            },
        },
    },
};

export const classic: Theme = {
    id: "classic",
    name: "Classic",
    theme: themeStyles,
};
