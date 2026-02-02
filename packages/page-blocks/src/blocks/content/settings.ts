import {
    Alignment,
    TextEditorContent,
    WidgetDefaultSettings,
} from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    title: string;
    description: TextEditorContent;
    headerAlignment: Alignment;
    cssId?: string;
}
