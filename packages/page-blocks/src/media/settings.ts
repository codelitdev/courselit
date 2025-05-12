import { Media, WidgetDefaultSettings } from "@courselit/common-models";
import { AspectRatio, ImageObjectFit } from "@courselit/components-library";
export default interface Settings extends WidgetDefaultSettings {
    media?: Media;
    youtubeLink?: string;
    backgroundColor?: string;
    mediaRadius?: number;
    cssId?: string;
    playVideoInModal?: boolean;
    aspectRatio?: AspectRatio;
    objectFit?: ImageObjectFit;
}
