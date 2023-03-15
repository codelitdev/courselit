import type {
    Alignment,
    Media,
    WidgetDefaultSettings,
} from "@courselit/common-models";

export interface Item {
    title: string;
    description?: Record<string, unknown>;
    buttonCaption?: string;
    buttonAction?: string;
    media?: Media;
}

export default interface Settings extends WidgetDefaultSettings {
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
