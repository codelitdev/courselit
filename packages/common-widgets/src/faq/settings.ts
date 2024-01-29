import { Alignment, WidgetDefaultSettings } from "@courselit/common-models";

export interface Item {
    title: string;
    description: Record<string, unknown>;
}

export default interface Settings extends WidgetDefaultSettings {
    title: string;
    description?: Record<string, unknown>;
    headerAlignment: Alignment;
    itemsAlignment: Alignment;
    backgroundColor?: string;
    foregroundColor?: string;
    items?: Item[];
    horizontalPadding: number;
    verticalPadding: number;
    cssId?: string;
}
