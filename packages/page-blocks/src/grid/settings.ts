import type {
    Alignment,
    Media,
    VerticalAlignment,
    WidgetDefaultSettings,
} from "@courselit/common-models";

export interface Item {
    title: string;
    description?: Record<string, unknown>;
    buttonCaption?: string;
    buttonAction?: string;
    media?: Partial<Media>;
    mediaAlignment?: VerticalAlignment;
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
    horizontalPadding: number;
    verticalPadding: number;
    itemBackgroundColor?: string;
    itemForegroundColor?: string;
    itemBorderColor?: string;
    itemBorderRadius?: number;
    cssId?: string;
    columns?: number;
}
