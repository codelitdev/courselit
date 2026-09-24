import type { Theme, ThemeStyle } from "@frontlit/page-builder/models";
import { themes as frontLitSystemThemes } from "@frontlit/page-builder/primitives";

// These hex values are the sRGB equivalents of CodeLit's OKLCH tokens. The
// public page-builder theme renderer currently accepts hex for color fields.

const courseLitLightColors: Partial<ThemeStyle["colors"]["light"]> = {
  background: "#f9f6f2",
  foreground: "#261d16",
  card: "#fefdfb",
  cardForeground: "#261d16",
  popover: "#fefdfb",
  popoverForeground: "#261d16",
  primary: "#c65b4c",
  primaryForeground: "#fdfcf8",
  secondary: "#eeebe5",
  secondaryForeground: "#352c25",
  muted: "#eeebe5",
  mutedForeground: "#6a6258",
  accent: "#eeebe5",
  accentForeground: "#352c25",
  destructive: "#c13c36",
  border: "#e2ddd5",
  input: "#d8d3cc",
  ring: "#c65b4c",
  chart1: "#c65b4c",
  chart2: "#5c544b",
  chart3: "#cf7b26",
  chart4: "#2d8949",
  chart5: "#c13c36",
  sidebar: "#fefdfb",
  sidebarForeground: "#261d16",
  sidebarPrimary: "#c65b4c",
  sidebarPrimaryForeground: "#fdfcf8",
  sidebarAccent: "#eeebe5",
  sidebarAccentForeground: "#352c25",
  sidebarBorder: "#e2ddd5",
  sidebarRing: "#c65b4c",
  shadow2xs: "0 1px 2px oklch(0.3 0.02 60 / 0.04)",
  shadowXs: "0 2px 12px oklch(0.3 0.02 60 / 0.06)",
  shadowSm: "0 4px 20px oklch(0.3 0.02 60 / 0.1)",
  shadowMd: "0 8px 32px oklch(0.3 0.02 60 / 0.14)",
  shadowLg: "0 8px 32px oklch(0.3 0.02 60 / 0.14)",
  shadowXl: "0 8px 32px oklch(0.3 0.02 60 / 0.14)",
  shadow2xl: "0 8px 32px oklch(0.3 0.02 60 / 0.14)",
};

const courseLitDarkColors: Partial<ThemeStyle["colors"]["dark"]> = {
  background: "#1b1510",
  foreground: "#ebe7e2",
  card: "#251e18",
  cardForeground: "#ebe7e2",
  popover: "#2a221d",
  popoverForeground: "#ebe7e2",
  primary: "#eb8373",
  primaryForeground: "#250e0b",
  secondary: "#312a24",
  secondaryForeground: "#dbd7d0",
  muted: "#2f2722",
  mutedForeground: "#989188",
  accent: "#312a24",
  accentForeground: "#dbd7d0",
  destructive: "#d9544b",
  border: "#38312b",
  input: "#433c35",
  ring: "#eb8373",
  chart1: "#eb8373",
  chart2: "#989188",
  chart3: "#df8f48",
  chart4: "#4fa866",
  chart5: "#d9544b",
  sidebar: "#251e18",
  sidebarForeground: "#ebe7e2",
  sidebarPrimary: "#eb8373",
  sidebarPrimaryForeground: "#250e0b",
  sidebarAccent: "#312a24",
  sidebarAccentForeground: "#dbd7d0",
  sidebarBorder: "#38312b",
  sidebarRing: "#eb8373",
  shadow2xs: "0 1px 2px oklch(0 0 0 / 0.25)",
  shadowXs: "0 2px 12px oklch(0 0 0 / 0.25)",
  shadowSm: "0 4px 20px oklch(0 0 0 / 0.35)",
  shadowMd: "0 8px 32px oklch(0 0 0 / 0.45)",
  shadowLg: "0 8px 32px oklch(0 0 0 / 0.45)",
  shadowXl: "0 8px 32px oklch(0 0 0 / 0.45)",
  shadow2xl: "0 8px 32px oklch(0 0 0 / 0.45)",
};

const frontLitClassic = frontLitSystemThemes.find((theme) => theme.id === "classic");

if (!frontLitClassic) {
  throw new Error("The FrontLit page builder does not provide its Classic theme.");
}

/**
 * CourseLit's Classic preset follows the shared CodeLit surface and color
 * tokens while retaining FrontLit's typography and any theme primitives the
 * CodeLit design system does not define.
 */
export const COURSELIT_CLASSIC_THEME: Theme = {
  ...frontLitClassic,
  theme: {
    ...frontLitClassic.theme,
    colors: {
      ...frontLitClassic.theme.colors,
      light: { ...frontLitClassic.theme.colors.light, ...courseLitLightColors },
      dark: { ...frontLitClassic.theme.colors.dark, ...courseLitDarkColors },
    },
    interactives: {
      ...frontLitClassic.theme.interactives,
      button: {
        ...frontLitClassic.theme.interactives.button,
        padding: { x: "px-4", y: "py-2" },
        border: { width: "border", style: "border-solid", radius: "rounded-xl" },
        shadow: "shadow-none",
      },
      card: {
        ...frontLitClassic.theme.interactives.card,
        padding: { x: "px-5", y: "py-5" },
        border: { width: "border", style: "border-solid", radius: "rounded-2xl" },
        shadow: "shadow-xs",
      },
      input: {
        ...frontLitClassic.theme.interactives.input,
        borderRadius: "rounded-xl",
        padding: { x: "px-3", y: "py-2" },
        border: { width: "border", style: "border-solid", radius: "rounded-xl" },
        shadow: "shadow-none",
      },
    },
  },
};

export const COURSELIT_SYSTEM_THEMES: Theme[] = frontLitSystemThemes.map((theme) =>
  theme.id === COURSELIT_CLASSIC_THEME.id ? COURSELIT_CLASSIC_THEME : theme,
);
