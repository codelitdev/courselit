import {
    Alignment,
    TextEditorContent,
    WidgetDefaultSettings,
} from "@courselit/common-models";

export interface Item {
    title: string;
    description: TextEditorContent;
}

export default interface Settings extends WidgetDefaultSettings {
    title: string;
    description?: TextEditorContent;
    headerAlignment: Alignment;
    itemsAlignment: Alignment;
    items?: Item[];
    cssId?: string;
    itemBeingEditedIndex?: number;
    layout?: "horizontal" | "vertical";
}
