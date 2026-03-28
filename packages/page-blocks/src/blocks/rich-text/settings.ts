import type {
    HorizontalAlignment,
    TextEditorContent,
    WidgetDefaultSettings,
} from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    text: TextEditorContent;
    alignment: HorizontalAlignment;
    cssId?: string;
    fontSize?: number;
}
