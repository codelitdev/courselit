import type {
    HorizontalAlignment,
    WidgetDefaultSettings,
} from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    text: Record<string, unknown>;
    alignment: HorizontalAlignment;
    color?: string;
    backgroundColor?: string;
    cssId?: string;
    fontSize?: number;
}
