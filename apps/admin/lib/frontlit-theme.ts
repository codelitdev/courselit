import type { Theme } from "@frontlit/page-builder/models";
import { themes as systemThemes } from "@frontlit/page-builder/primitives";
import type { FrontLitTheme } from "./frontlit-content";

export function themeSnapshot(theme: Theme): string {
  return JSON.stringify({ name: theme.name, theme: theme.theme });
}

export function toBuilderTheme(theme: FrontLitTheme): Theme {
  return {
    id: theme.themeId,
    name: theme.name,
    theme: theme.style as unknown as Theme["theme"],
  };
}

export function resolveEditorTheme(
  themeId: string | null,
  savedThemes: FrontLitTheme[],
): Theme | undefined {
  if (!themeId) return undefined;
  const systemTheme = systemThemes.find((theme) => theme.id === themeId);
  if (systemTheme) return systemTheme;
  const savedTheme = savedThemes.find((theme) => theme.themeId === themeId);
  return savedTheme ? toBuilderTheme(savedTheme) : undefined;
}

export async function persistCustomThemes(
  customThemes: Theme[],
  state: {
    aliases: Map<string, string>;
    knownIds: Set<string>;
    snapshots: Map<string, string>;
    create: (input: {
      name: string;
      style: Record<string, unknown>;
    }) => Promise<FrontLitTheme>;
    update: (
      themeId: string,
      patch: { name: string; style: Record<string, unknown> },
    ) => Promise<FrontLitTheme>;
  },
): Promise<void> {
  for (const theme of customThemes) {
    const savedId = state.aliases.get(theme.id) ?? theme.id;
    const snapshot = themeSnapshot(theme);

    if (!state.knownIds.has(savedId)) {
      const saved = await state.create({
        name: theme.name,
        style: theme.theme as unknown as Record<string, unknown>,
      });
      state.aliases.set(theme.id, saved.themeId);
      state.knownIds.add(saved.themeId);
      state.snapshots.set(saved.themeId, snapshot);
      continue;
    }

    if (state.snapshots.get(savedId) !== snapshot) {
      await state.update(savedId, {
        name: theme.name,
        style: theme.theme as unknown as Record<string, unknown>,
      });
      state.snapshots.set(savedId, snapshot);
    }
  }
}
