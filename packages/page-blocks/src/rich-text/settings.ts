import type {
    HorizontalAlignment,
    WidgetDefaultSettings,
} from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    text: Record<string, unknown>;
    alignment: HorizontalAlignment;
    color?: string;
    backgroundColor?: string;
    horizontalPadding: number;
    verticalPadding: number;
    cssId?: string;
    fontSize?: number;
}
