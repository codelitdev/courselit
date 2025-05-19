import { Theme, ThemeStyle } from "@courselit/page-models";

export type ThemeWithDraftState = Theme & {
    draftTheme?: ThemeStyle;
};
