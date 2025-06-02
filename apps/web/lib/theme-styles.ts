import { Theme } from "@courselit/page-models";
import convert, { HSL } from "color-convert";

function formatHSL(hsl: HSL): string {
    return `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`;
}

export function generateThemeStyles(theme: Theme): string {
    const { colors } = theme?.theme;
    if (!colors) {
        return "";
    }

    const lightColors = colors.light;
    const darkColors = colors.dark;
    if (!lightColors || !darkColors) {
        return "";
    }

    return `
        :root {
            /* Light theme colors */
            --background: ${lightColors.background ? formatHSL(convert.hex.hsl(lightColors.background.replace("#", ""))) : ""};
            --foreground: ${lightColors.foreground ? formatHSL(convert.hex.hsl(lightColors.foreground.replace("#", ""))) : ""};
            --card: ${lightColors.card ? formatHSL(convert.hex.hsl(lightColors.card.replace("#", ""))) : ""};
            --card-foreground: ${lightColors.cardForeground ? formatHSL(convert.hex.hsl(lightColors.cardForeground.replace("#", ""))) : ""};
            --popover: ${lightColors.popover ? formatHSL(convert.hex.hsl(lightColors.popover.replace("#", ""))) : ""};
            --popover-foreground: ${lightColors.popoverForeground ? formatHSL(convert.hex.hsl(lightColors.popoverForeground.replace("#", ""))) : ""};
            --primary: ${lightColors.primary ? formatHSL(convert.hex.hsl(lightColors.primary.replace("#", ""))) : ""};
            --primary-foreground: ${lightColors.primaryForeground ? formatHSL(convert.hex.hsl(lightColors.primaryForeground.replace("#", ""))) : ""};
            --secondary: ${lightColors.secondary ? formatHSL(convert.hex.hsl(lightColors.secondary.replace("#", ""))) : ""};
            --secondary-foreground: ${lightColors.secondaryForeground ? formatHSL(convert.hex.hsl(lightColors.secondaryForeground.replace("#", ""))) : ""};
            --muted: ${lightColors.muted ? formatHSL(convert.hex.hsl(lightColors.muted.replace("#", ""))) : ""};
            --muted-foreground: ${lightColors.mutedForeground ? formatHSL(convert.hex.hsl(lightColors.mutedForeground.replace("#", ""))) : ""};
            --accent: ${lightColors.accent ? formatHSL(convert.hex.hsl(lightColors.accent.replace("#", ""))) : ""};
            --accent-foreground: ${lightColors.accentForeground ? formatHSL(convert.hex.hsl(lightColors.accentForeground.replace("#", ""))) : ""};
            --destructive: ${lightColors.destructive ? formatHSL(convert.hex.hsl(lightColors.destructive.replace("#", ""))) : ""};
            --border: ${lightColors.border ? formatHSL(convert.hex.hsl(lightColors.border.replace("#", ""))) : ""};
            --input: ${lightColors.input ? formatHSL(convert.hex.hsl(lightColors.input.replace("#", ""))) : ""};
            --ring: ${lightColors.ring ? formatHSL(convert.hex.hsl(lightColors.ring.replace("#", ""))) : ""};
            --chart-1: ${lightColors.chart1 ? formatHSL(convert.hex.hsl(lightColors.chart1.replace("#", ""))) : ""};
            --chart-2: ${lightColors.chart2 ? formatHSL(convert.hex.hsl(lightColors.chart2.replace("#", ""))) : ""};
            --chart-3: ${lightColors.chart3 ? formatHSL(convert.hex.hsl(lightColors.chart3.replace("#", ""))) : ""};
            --chart-4: ${lightColors.chart4 ? formatHSL(convert.hex.hsl(lightColors.chart4.replace("#", ""))) : ""};
            --chart-5: ${lightColors.chart5 ? formatHSL(convert.hex.hsl(lightColors.chart5.replace("#", ""))) : ""};
            --sidebar: ${lightColors.sidebar ? formatHSL(convert.hex.hsl(lightColors.sidebar.replace("#", ""))) : ""};
            --sidebar-foreground: ${lightColors.sidebarForeground ? formatHSL(convert.hex.hsl(lightColors.sidebarForeground.replace("#", ""))) : ""};
            --sidebar-primary: ${lightColors.sidebarPrimary ? formatHSL(convert.hex.hsl(lightColors.sidebarPrimary.replace("#", ""))) : ""};
            --sidebar-primary-foreground: ${lightColors.sidebarPrimaryForeground ? formatHSL(convert.hex.hsl(lightColors.sidebarPrimaryForeground.replace("#", ""))) : ""};
            --sidebar-accent: ${lightColors.sidebarAccent ? formatHSL(convert.hex.hsl(lightColors.sidebarAccent.replace("#", ""))) : ""};
            --sidebar-accent-foreground: ${lightColors.sidebarAccentForeground ? formatHSL(convert.hex.hsl(lightColors.sidebarAccentForeground.replace("#", ""))) : ""};
            --sidebar-border: ${lightColors.sidebarBorder ? formatHSL(convert.hex.hsl(lightColors.sidebarBorder.replace("#", ""))) : ""};
            --sidebar-ring: ${lightColors.sidebarRing ? formatHSL(convert.hex.hsl(lightColors.sidebarRing.replace("#", ""))) : ""};
            --shadow-2xs: ${lightColors.shadow2xs};
            --shadow-xs: ${lightColors.shadowXs};
            --shadow-sm: ${lightColors.shadowSm};
            --shadow-md: ${lightColors.shadowMd};
            --shadow-lg: ${lightColors.shadowLg};
            --shadow-xl: ${lightColors.shadowXl};
            --shadow-2xl: ${lightColors.shadow2xl};
        }

        .dark {
            /* Dark theme colors */
            --background: ${darkColors.background ? formatHSL(convert.hex.hsl(darkColors.background.replace("#", ""))) : ""};
            --foreground: ${darkColors.foreground ? formatHSL(convert.hex.hsl(darkColors.foreground.replace("#", ""))) : ""};
            --card: ${darkColors.card ? formatHSL(convert.hex.hsl(darkColors.card.replace("#", ""))) : ""};
            --card-foreground: ${darkColors.cardForeground ? formatHSL(convert.hex.hsl(darkColors.cardForeground.replace("#", ""))) : ""};
            --popover: ${darkColors.popover ? formatHSL(convert.hex.hsl(darkColors.popover.replace("#", ""))) : ""};
            --popover-foreground: ${darkColors.popoverForeground ? formatHSL(convert.hex.hsl(darkColors.popoverForeground.replace("#", ""))) : ""};
            --primary: ${darkColors.primary ? formatHSL(convert.hex.hsl(darkColors.primary.replace("#", ""))) : ""};
            --primary-foreground: ${darkColors.primaryForeground ? formatHSL(convert.hex.hsl(darkColors.primaryForeground.replace("#", ""))) : ""};
            --secondary: ${darkColors.secondary ? formatHSL(convert.hex.hsl(darkColors.secondary.replace("#", ""))) : ""};
            --secondary-foreground: ${darkColors.secondaryForeground ? formatHSL(convert.hex.hsl(darkColors.secondaryForeground.replace("#", ""))) : ""};
            --muted: ${darkColors.muted ? formatHSL(convert.hex.hsl(darkColors.muted.replace("#", ""))) : ""};
            --muted-foreground: ${darkColors.mutedForeground ? formatHSL(convert.hex.hsl(darkColors.mutedForeground.replace("#", ""))) : ""};
            --accent: ${darkColors.accent ? formatHSL(convert.hex.hsl(darkColors.accent.replace("#", ""))) : ""};
            --accent-foreground: ${darkColors.accentForeground ? formatHSL(convert.hex.hsl(darkColors.accentForeground.replace("#", ""))) : ""};
            --destructive: ${darkColors.destructive ? formatHSL(convert.hex.hsl(darkColors.destructive.replace("#", ""))) : ""};
            --border: ${darkColors.border ? formatHSL(convert.hex.hsl(darkColors.border.replace("#", ""))) : ""};
            --input: ${darkColors.input ? formatHSL(convert.hex.hsl(darkColors.input.replace("#", ""))) : ""};
            --ring: ${darkColors.ring ? formatHSL(convert.hex.hsl(darkColors.ring.replace("#", ""))) : ""};
            --chart-1: ${darkColors.chart1 ? formatHSL(convert.hex.hsl(darkColors.chart1.replace("#", ""))) : ""};
            --chart-2: ${darkColors.chart2 ? formatHSL(convert.hex.hsl(darkColors.chart2.replace("#", ""))) : ""};
            --chart-3: ${darkColors.chart3 ? formatHSL(convert.hex.hsl(darkColors.chart3.replace("#", ""))) : ""};
            --chart-4: ${darkColors.chart4 ? formatHSL(convert.hex.hsl(darkColors.chart4.replace("#", ""))) : ""};
            --chart-5: ${darkColors.chart5 ? formatHSL(convert.hex.hsl(darkColors.chart5.replace("#", ""))) : ""};
            --sidebar: ${darkColors.sidebar ? formatHSL(convert.hex.hsl(darkColors.sidebar.replace("#", ""))) : ""};
            --sidebar-foreground: ${darkColors.sidebarForeground ? formatHSL(convert.hex.hsl(darkColors.sidebarForeground.replace("#", ""))) : ""};
            --sidebar-primary: ${darkColors.sidebarPrimary ? formatHSL(convert.hex.hsl(darkColors.sidebarPrimary.replace("#", ""))) : ""};
            --sidebar-primary-foreground: ${darkColors.sidebarPrimaryForeground ? formatHSL(convert.hex.hsl(darkColors.sidebarPrimaryForeground.replace("#", ""))) : ""};
            --sidebar-accent: ${darkColors.sidebarAccent ? formatHSL(convert.hex.hsl(darkColors.sidebarAccent.replace("#", ""))) : ""};
            --sidebar-accent-foreground: ${darkColors.sidebarAccentForeground ? formatHSL(convert.hex.hsl(darkColors.sidebarAccentForeground.replace("#", ""))) : ""};
            --sidebar-border: ${darkColors.sidebarBorder ? formatHSL(convert.hex.hsl(darkColors.sidebarBorder.replace("#", ""))) : ""};
            --sidebar-ring: ${darkColors.sidebarRing ? formatHSL(convert.hex.hsl(darkColors.sidebarRing.replace("#", ""))) : ""};
            --shadow-2xs: ${darkColors.shadow2xs};
            --shadow-xs: ${darkColors.shadowXs};
            --shadow-sm: ${darkColors.shadowSm};
            --shadow-md: ${darkColors.shadowMd};
            --shadow-lg: ${darkColors.shadowLg};
            --shadow-xl: ${darkColors.shadowXl};
            --shadow-2xl: ${darkColors.shadow2xl};
        }
    `;
}
