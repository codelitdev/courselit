import { Media, WidgetDefaultSettings } from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    media?: Media;
    youtubeLink?: string;
    backgroundColor?: string;
    mediaRadius?: number;
    horizontalPadding: number;
    verticalPadding: number;
    cssId?: string;
}
