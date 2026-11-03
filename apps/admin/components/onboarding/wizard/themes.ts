import { COURSELIT_SYSTEM_THEMES } from "@courselit/page-blocks/theme";

/** A theme tile: the real website theme's name and four swatches. */
export type ThemePreset = {
  id: string;
  name: string;
  dots: string[];
};

type LooseTheme = {
  id: string;
  name: string;
  theme: { colors: { light: Record<string, string | undefined> } };
};

/** The wizard's theme choices are the real website themes, not look-alikes. */
export const THEME_PRESETS: ThemePreset[] = (
  COURSELIT_SYSTEM_THEMES as unknown as LooseTheme[]
).map((item) => {
  const light = item.theme.colors.light;
  return {
    id: item.id,
    name: item.name,
    dots: [light.primary, light.secondary, light.accent, light.border].map(
      (value) => value ?? "#cccccc",
    ),
  };
});
