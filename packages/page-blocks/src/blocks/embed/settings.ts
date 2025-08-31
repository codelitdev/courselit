import { WidgetDefaultSettings } from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    contentType: "url" | "script";
    content: string;
    aspectRatio?: "16:9" | "4:3" | "1:1" | "default";
    height?: number;
    cssId?: string;
}
