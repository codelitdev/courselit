import { Theme, ThemeStyle } from "@courselit/page-models";

const themeStyles: ThemeStyle = {
    colors: {
        light: {
            background: "#ffffff",
            foreground: "#1a1a1a",
            card: "#ffffff",
            cardForeground: "#1a1a1a",
            popover: "#ffffff",
            popoverForeground: "#1a1a1a",
            primary: "#2563eb",
            primaryForeground: "#ffffff",
            secondary: "#f0f9ff",
            secondaryForeground: "#0369a1",
            muted: "#e0f2fe",
            mutedForeground: "#0c4a6e",
            accent: "#f0f9ff",
            accentForeground: "#0369a1",
            border: "#bae6fd",
            destructive: "#ef4444",
            input: "#bae6fd",
            ring: "#7dd3fc",
            chart1: "#2563eb",
            chart2: "#0ea5e9",
            chart3: "#38bdf8",
            chart4: "#7dd3fc",
            chart5: "#bae6fd",
            sidebar: "#ffffff",
            sidebarForeground: "#1a1a1a",
            sidebarPrimary: "#2563eb",
            sidebarPrimaryForeground: "#ffffff",
            sidebarAccent: "#f0f9ff",
            sidebarAccentForeground: "#0369a1",
            sidebarBorder: "#bae6fd",
            sidebarRing: "#7dd3fc",
            shadow2xs: "0 1px 2px 0px hsl(0 0% 0% / 0.05)",
            shadowXs: "0 1px 3px 0px hsl(0 0% 0% / 0.05)",
            shadowSm:
                "0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)",
            shadowMd:
                "0 2px 4px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)",
            shadowLg:
                "0 4px 6px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)",
            shadowXl:
                "0 8px 10px 0px hsl(0 0% 0% / 0.10), 0 16px 20px -1px hsl(0 0% 0% / 0.10)",
            shadow2xl:
                "0 16px 20px 0px hsl(0 0% 0% / 0.15), 0 32px 40px -1px hsl(0 0% 0% / 0.15)",
        },
        dark: {
            background: "#0f172a",
            foreground: "#f8fafc",
            card: "#1e293b",
            cardForeground: "#f8fafc",
            popover: "#1e293b",
            popoverForeground: "#f8fafc",
            primary: "#3b82f6",
            primaryForeground: "#ffffff",
            secondary: "#1e3a8a",
            secondaryForeground: "#f0f9ff",
            muted: "#1e3a8a",
            mutedForeground: "#bae6fd",
            accent: "#1e3a8a",
            accentForeground: "#f0f9ff",
            border: "#1e3a8a",
            destructive: "#f87171",
            input: "#1e3a8a",
            ring: "#60a5fa",
            chart1: "#3b82f6",
            chart2: "#60a5fa",
            chart3: "#93c5fd",
            chart4: "#bfdbfe",
            chart5: "#dbeafe",
            sidebar: "#1e293b",
            sidebarForeground: "#f8fafc",
            sidebarPrimary: "#3b82f6",
            sidebarPrimaryForeground: "#ffffff",
            sidebarAccent: "#1e3a8a",
            sidebarAccentForeground: "#f0f9ff",
            sidebarBorder: "#1e3a8a",
            sidebarRing: "#60a5fa",
            shadow2xs: "0 1px 2px 0px hsl(0 0% 0% / 0.05)",
            shadowXs: "0 1px 3px 0px hsl(0 0% 0% / 0.05)",
            shadowSm:
                "0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)",
            shadowMd:
                "0 2px 4px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)",
            shadowLg:
                "0 4px 6px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)",
            shadowXl:
                "0 8px 10px 0px hsl(0 0% 0% / 0.10), 0 16px 20px -1px hsl(0 0% 0% / 0.10)",
            shadow2xl:
                "0 16px 20px 0px hsl(0 0% 0% / 0.15), 0 32px 40px -1px hsl(0 0% 0% / 0.15)",
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
            shadow: "shadow-sm",
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
            shadow: "shadow-sm",
            hover: "transition-all duration-200 ease-in-out hover:shadow-2xl hover:scale-105",
        },
        input: {
            borderRadius: "rounded-lg",
            padding: { x: "px-5", y: "py-3" },
            border: {
                // width: "border-2",
                // style: "border-solid"
            },
            shadow: "shadow-sm",
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
