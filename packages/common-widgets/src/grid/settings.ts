import { Media } from "@courselit/common-models";

export interface Item {
    title: string;
    description?: Record<string, unknown>;
    buttonCaption?: string;
    buttonAction?: string;
    media?: Media;
}

export default interface Settings {
    title?: string;
    description?: Record<string, unknown>;
    buttonCaption?: string;
    buttonAction?: string;
    buttonBackground?: string;
    buttonForeground?: string;
    backgroundColor?: string;
    foregroundColor?: string;
    items?: Item[];
}
