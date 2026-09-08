"use client";

import { getDefaultTheme } from "@frontlit/page-builder";
import type { Theme } from "@frontlit/page-builder/models";
import { themes } from "@frontlit/page-builder/primitives";
import { generateThemeStyles } from "@frontlit/page-builder/renderer";

/**
 * Resolves the school's active theme.
 * Defaults to FrontLit's default theme if no themeId is provided.
 */
export function resolveSchoolTheme(
  themeId: string | null,
  themeStyle: Record<string, unknown> | null,
): Theme {
  if (themeStyle) {
    return {
      id: themeId ?? "custom",
      name: "Custom",
      theme: themeStyle as unknown as Theme["theme"],
    };
  }

  return themes.find((theme) => theme.id === themeId) ?? getDefaultTheme();
}

export function schoolThemeStyleTag(theme: Theme, selector = ":root"): string {
  return generateThemeStyles(theme, selector);
}
