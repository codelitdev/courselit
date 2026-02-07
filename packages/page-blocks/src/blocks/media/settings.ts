import { Media, WidgetDefaultSettings } from "@courselit/common-models";
import { ImageObjectFit } from "@courselit/components-library";
import { AspectRatio } from "../../components";
export default interface Settings extends WidgetDefaultSettings {
    media?: Media;
    youtubeLink?: string;
    mediaRadius?: number;
    cssId?: string;
    playVideoInModal?: boolean;
    aspectRatio?: AspectRatio;
    objectFit?: ImageObjectFit;
    hasBorder?: boolean;
}
