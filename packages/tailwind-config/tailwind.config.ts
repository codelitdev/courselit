import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                chart: {
                    "1": "hsl(var(--chart-1))",
                    "2": "hsl(var(--chart-2))",
                    "3": "hsl(var(--chart-3))",
                    "4": "hsl(var(--chart-4))",
                    "5": "hsl(var(--chart-5))",
                },
                sidebar: {
                    DEFAULT: "hsl(var(--sidebar-background))",
                    foreground: "hsl(var(--sidebar-foreground))",
                    primary: "hsl(var(--sidebar-primary))",
                    "primary-foreground":
                        "hsl(var(--sidebar-primary-foreground))",
                    accent: "hsl(var(--sidebar-accent))",
                    "accent-foreground":
                        "hsl(var(--sidebar-accent-foreground))",
                    border: "hsl(var(--sidebar-border))",
                    ring: "hsl(var(--sidebar-ring))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            fontFamily: {
                sans: ["var(--font-open-sans)"],
                montserrat: ["var(--font-montserrat)"],
                lato: ["var(--font-lato)"],
                poppins: ["var(--font-poppins)"],
                sourceSans3: ["var(--font-source-sans-3)"],
                raleway: ["var(--font-raleway)"],
                notoSans: ["var(--font-noto-sans)"],
                merriweather: ["var(--font-merriweather)"],
                inter: ["var(--font-inter)"],
                alegreya: ["var(--font-alegreya)"],
                roboto: ["var(--font-roboto)"],
                mulish: ["var(--font-mulish)"],
                nunito: ["var(--font-nunito)"],
                rubik: ["var(--font-rubik)"],
                playfairDisplay: ["var(--font-playfair-display)"],
                oswald: ["var(--font-oswald)"],
                ptSans: ["var(--font-pt-sans)"],
                workSans: ["var(--font-work-sans)"],
                robotoSlab: ["var(--font-roboto-slab)"],
                sourceSerif4: ["var(--font-source-serif-4)"],
                bebasNeue: ["var(--font-bebas-neue)"],
                quicksand: ["var(--font-quicksand)"],
            },
            boxShadow: {
                DEFAULT: "var(--shadow)",
                "2xs": "var(--shadow-2xs)",
                xs: "var(--shadow-xs)",
                sm: "var(--shadow-sm)",
                md: "var(--shadow-md)",
                lg: "var(--shadow-lg)",
                xl: "var(--shadow-xl)",
                "2xl": "var(--shadow-2xl)",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
    safelist: [
        {
            pattern: /text-(sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl)/,
            variants: ["lg"],
        },
        {
            pattern: /py-(4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20)/,
        },
        {
            pattern: /px-(4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20)/,
        },
        "transparent",
        {
            pattern:
                /bg-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)/,
            variants: ["hover", "disabled", "dark"],
        },
        {
            pattern:
                /text-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)/,
            variants: ["hover", "disabled", "dark"],
        },
        "transition",
        {
            pattern: /transition-(all|colors|opacity|shadow|transform|none)/,
        },
        {
            pattern: /duration-(0|75|100|150|200|300|500|700|1000)/,
        },
        {
            pattern: /ease-(in|out|in-out|linear)/,
            variants: ["hover"],
        },
        {
            pattern:
                /translate-x-(1|2|3|4|5|6|7|8|9|10|-1|-2|-3|-4|-5|-6|-7|-8|-9|-10)/,
            variants: ["hover"],
        },
        {
            pattern:
                /translate-y-(1|2|3|4|5|6|7|8|9|10|-1|-2|-3|-4|-5|-6|-7|-8|-9|-10)/,
            variants: ["hover"],
        },
        {
            pattern: /scale-(0|50|75|90|95|100|105|110|125|150)/,
            variants: ["hover"],
        },
        {
            pattern: /shadow-(sm|md|lg|xl|2xl|inner|none)/,
            variants: ["hover"],
        },
        {
            pattern: /underline/,
            variants: ["hover"],
        },
        {
            pattern: /border-(solid|dashed|dotted|double|none)/,
            variants: ["hover"],
        },
        {
            pattern: /shadow-(sm|md|lg|xl|2xl|inner|none)/,
            variants: ["hover", "dark"],
        },
        {
            pattern: /max-w-(2xl|3xl|4xl|5xl|6xl)/,
            variants: ["lg"],
        },
    ],
};
export default config;
