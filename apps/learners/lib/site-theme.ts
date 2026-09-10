"use client";

import { getDefaultTheme } from "@frontlit/page-builder";
import type { Theme, ThemeStyle } from "@frontlit/page-builder/models";
import { themes } from "@frontlit/page-builder/primitives";
import { generateThemeStyles } from "@frontlit/page-builder/renderer";

/**
 * Resolves the school's active theme.
 * Defaults to the page-builder's default theme if no themeId is provided.
 */
export function resolveSchoolTheme(
  themeId: string | null,
  themeStyle: Record<string, unknown> | null,
): Theme {
  const baseTheme = themes.find((theme) => theme.id === themeId) ?? getDefaultTheme();
  if (themeStyle) {
    return {
      id: baseTheme.id,
      name: baseTheme.name,
      theme: mergeThemeStyle(baseTheme.theme, themeStyle),
    };
  }

  return baseTheme;
}

function mergeThemeStyle(
  base: ThemeStyle,
  override: Record<string, unknown>,
): ThemeStyle {
  const merge = (baseValue: unknown, overrideValue: unknown): unknown => {
    if (
      baseValue &&
      overrideValue &&
      typeof baseValue === "object" &&
      typeof overrideValue === "object" &&
      !Array.isArray(baseValue) &&
      !Array.isArray(overrideValue)
    ) {
      const result: Record<string, unknown> = {
        ...(baseValue as Record<string, unknown>),
      };
      for (const [key, value] of Object.entries(overrideValue)) {
        result[key] = merge(result[key], value);
      }
      return result;
    }
    return overrideValue === undefined || overrideValue === null
      ? baseValue
      : overrideValue;
  };

  return merge(base, override) as ThemeStyle;
}

export function schoolThemeStyleTag(theme: Theme, selector = ":root"): string {
  return generateThemeStyles(theme, selector);
}
