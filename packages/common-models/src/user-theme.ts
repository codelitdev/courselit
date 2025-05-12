import Theme from "./theme";

export interface UserTheme {
    themeId: string;
    name: string;
    parentThemeId: string;
    userId: string;
    theme: Theme;
    draftTheme: Theme;
    createdAt: Date;
    updatedAt: Date;
}
