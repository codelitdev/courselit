import { UserTheme } from "./UserTheme";

export interface UITheme extends Pick<UserTheme, "themeId" | "name" | "theme"> {
    draftTheme?: UserTheme["draftTheme"];
}
