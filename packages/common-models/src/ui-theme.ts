import type { UserTheme } from "./user-theme";

export interface UITheme extends Pick<UserTheme, "themeId" | "name" | "theme"> {
    draftTheme?: UserTheme["draftTheme"];
}
