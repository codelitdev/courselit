import type { Theme as ThemeStyles } from "@courselit/common-models";

export interface Theme {
    id: string;
    name: string;
    styles: ThemeStyles;
}
