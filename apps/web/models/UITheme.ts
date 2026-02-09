import type { UserTheme } from "@courselit/orm-models/dao/user-theme";

export interface UITheme extends Pick<UserTheme, "themeId" | "name" | "theme"> {
    draftTheme?: UserTheme["draftTheme"];
}
