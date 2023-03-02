import { Media } from "@courselit/common-models";

export interface Item {
    title: string;
    description?: Record<string, unknown>;
    buttonCaption?: string;
    buttonAction?: string;
    media?: Media;
}

export type Alignment = "center" | "left";

export default interface Settings {
    title: string;
    description?: Record<string, unknown>;
    headerAlignment: Alignment;
    itemsAlignment: Alignment;
    buttonCaption?: string;
    buttonAction?: string;
    buttonBackground?: string;
    buttonForeground?: string;
    backgroundColor?: string;
    foregroundColor?: string;
    items?: Item[];
}
