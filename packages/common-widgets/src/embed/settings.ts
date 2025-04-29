import { WidgetDefaultSettings } from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    backgroundColor?: string;
    url: string;
    script?: string;
    aspectRatio?: "16:9" | "4:3" | "1:1" | "default";
    height?: number;
    horizontalPadding: number;
    verticalPadding: number;
    cssId?: string;
}
