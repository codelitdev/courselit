import type {
    Alignment,
    WidgetDefaultSettings,
} from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    text: Record<string, unknown>;
    alignment: Alignment | "right";
    color?: string;
    backgroundColor?: string;
    horizontalPadding: number;
    verticalPadding: number;
    cssId?: string;
    fontSize?: number;
}
